import { app } from 'electron';
import { spawn, ChildProcessByStdio } from 'child_process';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

type NativeSource = {
  id: string;
  type: 'screen' | 'window' | 'tab';
  name: string;
};

type TimedPcm = {
  ts: number;
  pcm: Buffer;
  dbfs: number;
};

const BUFFER_WINDOW_MS = 60_000;
const SAMPLE_RATE = 16_000;

export class NativeAudioManager {
  private proc: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private chunks: TimedPcm[] = [];
  private lineBuffer = '';
  private lastError: string | null = null;
  private sampleRate = SAMPLE_RATE;

  async start(source: NativeSource) {
    this.stop();

    if (process.platform !== 'darwin') {
      throw new Error('Native macOS audio helper is only available on macOS.');
    }

    const helperSourcePath = path.join(
      app.getAppPath(),
      'electron',
      'native',
      'macos',
      'TAAudioHelper.swift'
    );
    const helperBinaryPath = await this.ensureHelperBinary(helperSourcePath);

    const proc = spawn(
      helperBinaryPath,
      [
        '--source-type',
        source.type,
        '--source-name',
        source.name,
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    this.proc = proc;

    proc.stdout.on('data', (chunk) => {
      this.onStdout(chunk.toString('utf-8'));
    });

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf-8').trim();
      if (text) {
        this.lastError = text;
        console.error('[TA-NATIVE-AUDIO]', text);
      }
    });

    proc.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        this.lastError = `Helper exited code=${code} signal=${signal}`;
      }
    });
  }

  stop() {
    if (this.proc) {
      this.proc.kill('SIGTERM');
    }
    this.proc = null;
    this.chunks = [];
    this.lineBuffer = '';
    this.lastError = null;
    this.sampleRate = SAMPLE_RATE;
  }

  getSliceWav(seconds: number): Uint8Array | null {
    const cutoff = Date.now() - seconds * 1000;
    const recent = this.chunks.filter((chunk) => chunk.ts >= cutoff);
    if (recent.length === 0) return null;
    const pcm = Buffer.concat(recent.map((chunk) => chunk.pcm));
    const wav = encodeWavPcm16Mono(pcm, this.sampleRate);
    return new Uint8Array(wav);
  }

  getDebug(seconds: number) {
    const cutoff = Date.now() - seconds * 1000;
    const recent = this.chunks.filter((chunk) => chunk.ts >= cutoff);
    const lastChunk = this.chunks[this.chunks.length - 1];
    const avgDbfs = recent.length
      ? recent.reduce((sum, chunk) => sum + chunk.dbfs, 0) / recent.length
      : null;
    return {
      running: !!this.proc,
      bufferedChunks: this.chunks.length,
      recentChunks: recent.length,
      recentBytes: recent.reduce((sum, chunk) => sum + chunk.pcm.length, 0),
      sampleRate: this.sampleRate,
      lastChunkDbfs: lastChunk ? Number(lastChunk.dbfs.toFixed(2)) : null,
      avgWindowDbfs: avgDbfs !== null ? Number(avgDbfs.toFixed(2)) : null,
      lastError: this.lastError,
    };
  }

  private onStdout(data: string) {
    this.lineBuffer += data;
    while (true) {
      const idx = this.lineBuffer.indexOf('\n');
      if (idx === -1) break;
      const line = this.lineBuffer.slice(0, idx).trim();
      this.lineBuffer = this.lineBuffer.slice(idx + 1);
      if (!line) continue;
      this.handleHelperEvent(line);
    }
  }

  private handleHelperEvent(line: string) {
    try {
      const event = JSON.parse(line) as
        | { type: 'audio'; pcm: string; ts: number; sampleRate?: number }
        | { type: 'error'; message: string }
        | { type: 'status'; message: string }
        | { type: 'warn'; message: string };

      if (event.type === 'audio') {
        const pcm = Buffer.from(event.pcm, 'base64');
        if (event.sampleRate && Number.isFinite(event.sampleRate) && event.sampleRate > 0) {
          this.sampleRate = Math.round(event.sampleRate);
        }
        this.chunks.push({
          ts: event.ts,
          pcm,
          dbfs: computePcm16Dbfs(pcm),
        });
        this.prune();
        return;
      }

      if (event.type === 'error') {
        this.lastError = event.message;
        console.error('[TA-NATIVE-AUDIO]', event.message);
        return;
      }

      if (event.type === 'warn') {
        this.lastError = event.message;
        console.warn('[TA-NATIVE-AUDIO]', event.message);
        return;
      }

      if (event.type === 'status') {
        if (event.message) {
          console.log('[TA-NATIVE-AUDIO]', event.message);
        }
        return;
      }
    } catch {
      // ignore malformed helper lines
    }
  }

  private prune() {
    const cutoff = Date.now() - BUFFER_WINDOW_MS;
    this.chunks = this.chunks.filter((chunk) => chunk.ts >= cutoff);
  }

  private async ensureHelperBinary(helperSourcePath: string): Promise<string> {
    const binaryDir = path.join(app.getPath('userData'), 'native');
    const binaryPath = path.join(binaryDir, 'ta-audio-helper');
    const sourceStat = fs.statSync(helperSourcePath);

    let needsBuild = true;
    if (fs.existsSync(binaryPath)) {
      try {
        const binStat = fs.statSync(binaryPath);
        needsBuild = binStat.mtimeMs < sourceStat.mtimeMs;
      } catch {
        needsBuild = true;
      }
    }

    if (!needsBuild) {
      return binaryPath;
    }

    fs.mkdirSync(binaryDir, { recursive: true });
    await this.compileHelper(helperSourcePath, binaryPath);
    return binaryPath;
  }

  private compileHelper(sourcePath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        'xcrun',
        [
          'swiftc',
          sourcePath,
          '-O',
          '-framework',
          'ScreenCaptureKit',
          '-framework',
          'CoreMedia',
          '-framework',
          'AppKit',
          '-framework',
          'CoreGraphics',
          '-o',
          outputPath,
        ],
        {
          env: { ...process.env, TMPDIR: os.tmpdir() },
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      let stderr = '';
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf-8');
      });
      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf-8').trim();
        if (text) console.log('[TA-NATIVE-AUDIO][BUILD]', text);
      });
      proc.on('exit', (code) => {
        if (code === 0) {
          try {
            fs.chmodSync(outputPath, 0o755);
          } catch {
            // ignore chmod errors
          }
          console.log('[TA-NATIVE-AUDIO] Helper binary compiled', outputPath);
          resolve();
          return;
        }
        reject(new Error(`Failed to compile native helper (code=${code}): ${stderr}`));
      });
    });
  }
}

function computePcm16Dbfs(pcm: Buffer): number {
  if (!pcm.length) return -120;
  const sampleCount = Math.floor(pcm.length / 2);
  if (sampleCount <= 0) return -120;
  let sumSquares = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const sample = pcm.readInt16LE(i * 2) / 32768;
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / sampleCount);
  if (rms <= 0) return -120;
  return 20 * Math.log10(rms);
}

function encodeWavPcm16Mono(pcm: Buffer, sampleRate: number) {
  const dataSize = pcm.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcm.copy(buffer, 44);

  return buffer;
}
