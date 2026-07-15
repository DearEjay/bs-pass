'use client'

import type { FFmpeg } from '@ffmpeg/ffmpeg'

let ff: FFmpeg | null = null

// All files served from public/ffmpeg/ (same-origin, committed to repo).
// classWorkerURL bypasses webpack's broken `new URL('./worker.js', import.meta.url)`
// resolution for dynamically imported modules — the browser loads the worker
// directly from the URL we provide instead.
async function getFFmpeg(): Promise<FFmpeg> {
  if (ff) return ff
  const { FFmpeg: FFmpegClass } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')
  const instance = new FFmpegClass()
  await instance.load({
    classWorkerURL: '/ffmpeg/worker.js',
    coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
    wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
  })
  ff = instance
  return ff
}

// Supabase free-tier enforces ~50 MB per upload at the infrastructure layer,
// regardless of the bucket's file_size_limit setting.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/**
 * Converts WAV → FLAC (lossless, ~50% smaller). All other formats pass through.
 * Throws a user-visible error if the result would still exceed the upload limit.
 */
export async function compressAudioIfNeeded(file: File): Promise<File> {
  if (typeof window === 'undefined') return file

  const isWav =
    file.type === 'audio/wav' ||
    file.type === 'audio/x-wav' ||
    file.name.toLowerCase().endsWith('.wav')

  if (!isWav) return file

  let compressed: File | null = null
  let compressionErr: unknown = null

  try {
    const ffmpeg = await getFFmpeg()
    const { fetchFile } = await import('@ffmpeg/util')

    await ffmpeg.writeFile('input.wav', await fetchFile(file))
    await ffmpeg.exec(['-i', 'input.wav', '-compression_level', '8', 'output.flac'])

    const data = await ffmpeg.readFile('output.flac')
    const blob = new Blob([data as unknown as ArrayBuffer], { type: 'audio/flac' })
    const flacName = file.name.replace(/\.wav$/i, '.flac')

    await ffmpeg.deleteFile('input.wav').catch(() => {})
    await ffmpeg.deleteFile('output.flac').catch(() => {})

    compressed = new File([blob], flacName, { type: 'audio/flac' })
  } catch (err) {
    compressionErr = err
    console.warn('WAV → FLAC compression failed:', err)
  }

  if (compressed) {
    if (compressed.size > MAX_UPLOAD_BYTES) {
      const mb = (compressed.size / 1024 / 1024).toFixed(0)
      throw new Error(
        `Even after lossless compression this file is ${mb} MB. ` +
        `Please export it as MP3 (320 kbps) and upload that instead.`,
      )
    }
    return compressed
  }

  // Compression failed — only fall back to the original if it fits
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(0)
    const detail = compressionErr instanceof Error ? `: ${compressionErr.message}` : ''
    throw new Error(
      `WAV compression failed (${mb} MB file${detail}). ` +
      `Please export it as FLAC or MP3 and try again.`,
    )
  }

  return file
}
