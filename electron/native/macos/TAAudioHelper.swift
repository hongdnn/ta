import Foundation
import ScreenCaptureKit
import CoreMedia
import AppKit
import AudioToolbox

struct CliArgs {
    var sourceType: String = "screen"
    var sourceName: String = ""
}

func parseArgs() -> CliArgs {
    var args = CliArgs()
    var i = 1
    while i < CommandLine.arguments.count {
        let key = CommandLine.arguments[i]
        if key == "--source-type", i + 1 < CommandLine.arguments.count {
            args.sourceType = CommandLine.arguments[i + 1]
            i += 2
            continue
        }
        if key == "--source-name", i + 1 < CommandLine.arguments.count {
            args.sourceName = CommandLine.arguments[i + 1]
            i += 2
            continue
        }
        i += 1
    }
    return args
}

func emit(_ payload: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload),
          let line = String(data: data, encoding: .utf8) else {
        return
    }
    FileHandle.standardOutput.write(Data((line + "\n").utf8))
}

@available(macOS 13.0, *)
final class AudioOutput: NSObject, SCStreamOutput {
    private var didEmitFormatInfo = false

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of outputType: SCStreamOutputType) {
        guard outputType == .audio else { return }
        guard sampleBuffer.isValid else { return }
        guard let (int16Pcm, sampleRate) = pcm16Mono(from: sampleBuffer) else { return }
        let b64 = int16Pcm.base64EncodedString()
        emit([
            "type": "audio",
            "pcm": b64,
            "sampleRate": Int(sampleRate.rounded()),
            "ts": Int(Date().timeIntervalSince1970 * 1000)
        ])
    }

    private func pcm16Mono(from sampleBuffer: CMSampleBuffer) -> (Data, Double)? {
        guard let format = CMSampleBufferGetFormatDescription(sampleBuffer),
              let asbdPtr = CMAudioFormatDescriptionGetStreamBasicDescription(format) else {
            return nil
        }
        let asbd = asbdPtr.pointee
        let channels = Int(asbd.mChannelsPerFrame)
        if channels <= 0 {
            return nil
        }

        let frameCount = CMSampleBufferGetNumSamples(sampleBuffer)
        if frameCount <= 0 {
            return nil
        }

        let bufferListSize = MemoryLayout<AudioBufferList>.size
            + MemoryLayout<AudioBuffer>.size * max(0, channels - 1)
        let rawBufferListPointer = UnsafeMutableRawPointer.allocate(
            byteCount: bufferListSize,
            alignment: MemoryLayout<AudioBufferList>.alignment
        )
        defer { rawBufferListPointer.deallocate() }
        let audioBufferListPointer = rawBufferListPointer.assumingMemoryBound(to: AudioBufferList.self)

        var blockBuffer: CMBlockBuffer?
        let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sampleBuffer,
            bufferListSizeNeededOut: nil,
            bufferListOut: audioBufferListPointer,
            bufferListSize: bufferListSize,
            blockBufferAllocator: nil,
            blockBufferMemoryAllocator: nil,
            flags: UInt32(kCMSampleBufferFlag_AudioBufferList_Assure16ByteAlignment),
            blockBufferOut: &blockBuffer
        )
        guard status == noErr else {
            return nil
        }

        let buffers = UnsafeMutableAudioBufferListPointer(audioBufferListPointer)
        let isFloat = (asbd.mFormatFlags & kAudioFormatFlagIsFloat) != 0
        let isSignedInt = (asbd.mFormatFlags & kAudioFormatFlagIsSignedInteger) != 0
        let isNonInterleaved = (asbd.mFormatFlags & kAudioFormatFlagIsNonInterleaved) != 0
        let bitsPerChannel = Int(asbd.mBitsPerChannel)
        if !didEmitFormatInfo {
            didEmitFormatInfo = true
            emit([
                "type": "status",
                "message": "audio-format sr=\(Int(asbd.mSampleRate.rounded())) ch=\(channels) bits=\(bitsPerChannel) float=\(isFloat) int=\(isSignedInt) nonInterleaved=\(isNonInterleaved)"
            ])
        }

        var out = Data(count: frameCount * 2)
        out.withUnsafeMutableBytes { (dstRaw: UnsafeMutableRawBufferPointer) in
            guard let dstBase = dstRaw.baseAddress else { return }
            let dst = dstBase.assumingMemoryBound(to: Int16.self)

            for frame in 0..<frameCount {
                var sum: Float = 0
                var usedChannels = 0

                for channel in 0..<channels {
                    let bufferIndex = isNonInterleaved ? channel : 0
                    guard bufferIndex < buffers.count,
                          let srcBase = buffers[bufferIndex].mData else {
                        continue
                    }

                    let sampleIndex = isNonInterleaved ? frame : (frame * channels + channel)
                    var sampleFloat: Float = 0

                    if isFloat && bitsPerChannel == 32 {
                        let src = srcBase.assumingMemoryBound(to: Float.self)
                        sampleFloat = src[sampleIndex]
                    } else if isFloat && bitsPerChannel == 64 {
                        let src = srcBase.assumingMemoryBound(to: Double.self)
                        sampleFloat = Float(src[sampleIndex])
                    } else if isSignedInt && bitsPerChannel == 16 {
                        let src = srcBase.assumingMemoryBound(to: Int16.self)
                        sampleFloat = Float(src[sampleIndex]) / Float(Int16.max)
                    } else if isSignedInt && bitsPerChannel == 32 {
                        let src = srcBase.assumingMemoryBound(to: Int32.self)
                        sampleFloat = Float(src[sampleIndex]) / Float(Int32.max)
                    } else if isSignedInt && bitsPerChannel == 8 {
                        let src = srcBase.assumingMemoryBound(to: Int8.self)
                        sampleFloat = Float(src[sampleIndex]) / Float(Int8.max)
                    } else {
                        continue
                    }

                    sum += sampleFloat
                    usedChannels += 1
                }

                let divisor = Float(max(usedChannels, 1))
                var value = sum / divisor
                if value > 1 { value = 1 }
                if value < -1 { value = -1 }
                dst[frame] = Int16(value * Float(Int16.max))
            }
        }
        return (out, Double(asbd.mSampleRate))
    }
}

@available(macOS 13.0, *)
final class VideoOutput: NSObject, SCStreamOutput {
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of outputType: SCStreamOutputType) {
        // No-op: attaching a screen output improves capture stability for audio on some macOS setups.
        _ = sampleBuffer
        _ = outputType
    }
}

@available(macOS 13.0, *)
final class CaptureRunner {
    private let output = AudioOutput()
    private let videoOutput = VideoOutput()
    private var stream: SCStream?

    @MainActor
    func run(args: CliArgs) async {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            let filter = try makeFilter(content: content, args: args)

            let config = SCStreamConfiguration()
            config.capturesAudio = true
            config.excludesCurrentProcessAudio = false
            config.queueDepth = 1

            let stream = SCStream(filter: filter, configuration: config, delegate: nil)
            self.stream = stream
            try stream.addStreamOutput(output, type: .audio, sampleHandlerQueue: DispatchQueue(label: "ta.audio.queue"))
            try stream.addStreamOutput(videoOutput, type: .screen, sampleHandlerQueue: DispatchQueue(label: "ta.video.queue"))
            try await stream.startCapture()
            emit(["type": "status", "message": "started"])
        } catch {
            emit(["type": "error", "message": "Failed to start native capture: \(error.localizedDescription)"])
            exit(1)
        }
    }

    @MainActor
    private func makeFilter(content: SCShareableContent, args: CliArgs) throws -> SCContentFilter {
        if args.sourceType == "window",
           let match = content.windows.first(where: { ($0.title ?? "").localizedCaseInsensitiveContains(args.sourceName) }) {
            return SCContentFilter(desktopIndependentWindow: match)
        }

        if let idx = parseScreenIndex(name: args.sourceName), content.displays.indices.contains(idx) {
            return SCContentFilter(display: content.displays[idx], excludingWindows: [])
        }

        guard let first = content.displays.first else {
            throw NSError(domain: "ta.native", code: 1, userInfo: [NSLocalizedDescriptionKey: "No displays available"])
        }
        return SCContentFilter(display: first, excludingWindows: [])
    }

    private func parseScreenIndex(name: String) -> Int? {
        let pattern = #"(\d+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(name.startIndex..<name.endIndex, in: name)
        guard let match = regex.firstMatch(in: name, options: [], range: range),
              let numberRange = Range(match.range(at: 1), in: name),
              let value = Int(name[numberRange]) else {
            return nil
        }
        return max(0, value - 1)
    }
}

if #available(macOS 13.0, *) {
    _ = NSApplication.shared
    let args = parseArgs()
    let runner = CaptureRunner()
    Task { @MainActor in
        await runner.run(args: args)
    }
    RunLoop.main.run()
} else {
    emit(["type": "error", "message": "ScreenCaptureKit requires macOS 13+"])
    exit(1)
}
