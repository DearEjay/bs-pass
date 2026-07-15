'use client'

import type { FFmpeg } from '@ffmpeg/ffmpeg'

let ff: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ff) return ff
  // Dynamic imports — never evaluated during SSR/Node.js, only in the browser
  const { FFmpeg: FFmpegClass } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')

  const instance = new FFmpegClass()
  // Single-threaded core: no SharedArrayBuffer / COOP-COEP headers required
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
  await instance.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ff = instance
  return ff
}

/**
 * Converts WAV → FLAC (lossless, ~50% smaller). All other formats pass through unchanged.
 * WASM is lazy-loaded only when a WAV is detected. Falls back to the original file on any
 * error so a compression failure never blocks the upload.
 */
export async function compressAudioIfNeeded(file: File): Promise<File> {
  if (typeof window === 'undefined') return file

  const isWav =
    file.type === 'audio/wav' ||
    file.type === 'audio/x-wav' ||
    file.name.toLowerCase().endsWith('.wav')

  if (!isWav) return file

  try {
    const ffmpeg = await getFFmpeg()
    const { fetchFile } = await import('@ffmpeg/util')

    await ffmpeg.writeFile('input.wav', await fetchFile(file))
    await ffmpeg.exec(['-i', 'input.wav', '-compression_level', '8', 'output.flac'])

    const data = await ffmpeg.readFile('output.flac')
    const blob = new Blob([data as unknown as ArrayBuffer], { type: 'audio/flac' })
    const flacName = file.name.replace(/\.wav$/i, '.flac')

    await ffmpeg.deleteFile('input.wav')
    await ffmpeg.deleteFile('output.flac')

    return new File([blob], flacName, { type: 'audio/flac' })
  } catch (err) {
    console.warn('Audio compression failed — uploading original file:', err)
    return file
  }
}
