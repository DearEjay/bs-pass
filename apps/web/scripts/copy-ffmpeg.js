const { copyFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')

const src = join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const dst = join(__dirname, '..', 'public', 'ffmpeg')

if (!existsSync(join(src, 'ffmpeg-core.wasm'))) {
  console.warn('ffmpeg-core not found in node_modules — skipping copy')
  process.exit(0)
}

mkdirSync(dst, { recursive: true })
copyFileSync(join(src, 'ffmpeg-core.js'), join(dst, 'ffmpeg-core.js'))
copyFileSync(join(src, 'ffmpeg-core.wasm'), join(dst, 'ffmpeg-core.wasm'))
console.log('✓ ffmpeg core copied to public/ffmpeg/')
