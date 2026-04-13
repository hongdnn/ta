type TimedPcmChunk = {
  samples: Float32Array;
  timestamp: number;
  dbfs: number;
};

const BUFFER_WINDOW_MS = 60_000;
const PROCESSOR_BUFFER_SIZE = 4096;

class AudioRingBuffer {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private chunks: TimedPcmChunk[] = [];
  private sampleRate = 16_000;
  private lastDebugLogAt = 0;

  async startDesktopAudio(sourceId: string) {
    this.stop();

    try {
      const mandatory = {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
      };
      const constraints = {
        audio: { mandatory },
        video: { mandatory },
      } as MediaStreamConstraints;
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });
    }
    // Keep the desktop video track alive.
    // On macOS, stopping it can also break/silence the associated loopback audio stream.
    const audioTracks = this.stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error('Desktop stream has no audio tracks. System audio loopback is unavailable.');
    }
    const track = audioTracks[0];
    const trackSettings = track.getSettings ? track.getSettings() : {};
    console.info('[WeMee] Desktop audio track', {
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: trackSettings,
    });

    // Do not force sample rate; some systems deliver silent buffers with forced 16k contexts.
    this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.sampleRate = this.audioContext.sampleRate;
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.processorNode = this.audioContext.createScriptProcessor(
      PROCESSOR_BUFFER_SIZE,
      1,
      1
    );
    this.silentGainNode = this.audioContext.createGain();
    this.silentGainNode.gain.value = 0;

    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      const inputBuffer = event.inputBuffer;
      const channelCount = inputBuffer.numberOfChannels;
      if (channelCount < 1) {
        return;
      }
      const frameCount = inputBuffer.length;
      const copy = new Float32Array(frameCount);
      if (channelCount === 1) {
        copy.set(inputBuffer.getChannelData(0));
      } else {
        // Mix down all channels to mono to avoid channel-specific silence.
        for (let i = 0; i < frameCount; i += 1) {
          let sum = 0;
          for (let ch = 0; ch < channelCount; ch += 1) {
            sum += inputBuffer.getChannelData(ch)[i] ?? 0;
          }
          copy[i] = sum / channelCount;
        }
      }
      const dbfs = this.computeDbfs(copy);
      const now = Date.now();
      this.chunks.push({ samples: copy, timestamp: now, dbfs });
      this.prune();

      // Lightweight debug heartbeat so we can verify audio isn't silent.
      if (now - this.lastDebugLogAt > 2000) {
        this.lastDebugLogAt = now;
        console.info('[WeMee] Audio chunk level (dBFS)', dbfs.toFixed(1));
      }
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.silentGainNode);
    this.silentGainNode.connect(this.audioContext.destination);
  }

  stop() {
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
    }
    this.processorNode = null;

    this.sourceNode?.disconnect();
    this.sourceNode = null;

    this.silentGainNode?.disconnect();
    this.silentGainNode = null;

    if (this.audioContext) {
      void this.audioContext.close();
    }
    this.audioContext = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.chunks = [];
    this.lastDebugLogAt = 0;
  }

  getLastSeconds(seconds: number): Blob | null {
    const cutoff = Date.now() - seconds * 1000;
    const recent = this.chunks.filter((chunk) => chunk.timestamp >= cutoff);
    if (recent.length === 0) return null;

    const totalSamples = recent.reduce((sum, chunk) => sum + chunk.samples.length, 0);
    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of recent) {
      merged.set(chunk.samples, offset);
      offset += chunk.samples.length;
    }

    return this.encodeWav(merged, this.sampleRate);
  }

  isRunning() {
    return !!this.audioContext && this.audioContext.state !== 'closed';
  }

  getDebugSnapshot(windowSeconds = 20) {
    const cutoff = Date.now() - windowSeconds * 1000;
    const recent = this.chunks.filter((chunk) => chunk.timestamp >= cutoff);
    const avgDbfs = recent.length
      ? recent.reduce((sum, chunk) => sum + chunk.dbfs, 0) / recent.length
      : null;
    const lastChunk = this.chunks[this.chunks.length - 1];
    return {
      isRunning: this.isRunning(),
      sampleRate: this.sampleRate,
      bufferedChunks: this.chunks.length,
      recentChunks: recent.length,
      lastChunkDbfs: lastChunk ? Number(lastChunk.dbfs.toFixed(2)) : null,
      avgWindowDbfs: avgDbfs !== null ? Number(avgDbfs.toFixed(2)) : null,
    };
  }

  private prune() {
    const cutoff = Date.now() - BUFFER_WINDOW_MS;
    this.chunks = this.chunks.filter((chunk) => chunk.timestamp >= cutoff);
  }

  private encodeWav(samples: Float32Array, sampleRate: number) {
    const bytesPerSample = 2;
    const blockAlign = bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let index = 44;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      index += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  private computeDbfs(samples: Float32Array) {
    if (samples.length === 0) return -120;
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    if (rms <= 0) return -120;
    return 20 * Math.log10(rms);
  }
}

export const audioRingBuffer = new AudioRingBuffer();
