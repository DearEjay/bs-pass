'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ff: FFmpeg | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ff) return ff
  ff = new FFmpeg()
  // Single-threaded core — no SharedArrayBuffer / COOP headers required
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ff
}

/**
 * Converts WAV → FLAC (lossless, ~50% smaller). All other formats pass through unchanged.
 * The WASM is lazy-loaded the first time a WAV is detected.
 */
export async function compressAudioIfNeeded(file: File): Promise<File> {
  const isWav =
    file.type === 'audio/wav' ||
    file.type === 'audio/x-wav' ||
    file.name.toLowerCase().endsWith('.wav')

  if (!isWav) return file

  const ffmpeg = await getFFmpeg()

  await ffmpeg.writeFile('input.wav', await fetchFile(file))
  await ffmpeg.exec(['-i', 'input.wav', '-compression_level', '8', 'output.flac'])

  const data = await ffmpeg.readFile('output.flac')
  const blob = new Blob([data as unknown as ArrayBuffer], { type: 'audio/flac' })
  const flacName = file.name.replace(/\.wav$/i, '.flac')

  await ffmpeg.deleteFile('input.wav')
  await ffmpeg.deleteFile('output.flac')

  return new File([blob], flacName, { type: 'audio/flac' })
}
