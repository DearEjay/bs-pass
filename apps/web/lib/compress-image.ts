'use client'

/**
 * Converts JPEG/PNG/GIF/BMP → WebP at 0.92 quality (near-lossless, ~60–70% smaller).
 * WebP and SVG pass through unchanged.
 * Caps the longest dimension at maxDimension px to avoid pointlessly huge cover art.
 */
export async function compressImageIfNeeded(file: File, maxDimension = 2400): Promise<File> {
  const isCompressible =
    /^image\/(jpeg|png|gif|bmp|tiff)$/i.test(file.type) ||
    /\.(jpe?g|png|gif|bmp|tiff?)$/i.test(file.name)

  if (!isCompressible) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('Image compression failed'))
          const name = file.name.replace(/\.(jpe?g|png|gif|bmp|tiff?)$/i, '.webp')
          resolve(new File([blob], name, { type: 'image/webp' }))
        },
        'image/webp',
        0.92,
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}
