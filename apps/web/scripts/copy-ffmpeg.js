const { copyFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')

const coreDir = join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const workerDir = join(__dirname, '..', 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm')
const dst = join(__dirname, '..', 'public', 'ffmpeg')

if (!existsSync(join(coreDir, 'ffmpeg-core.wasm'))) {
  console.warn('ffmpeg-core not found in node_modules — skipping copy')
  process.exit(0)
}

mkdirSync(dst, { recursive: true })

// Core WASM + JS (from @ffmpeg/core)
copyFileSync(join(coreDir, 'ffmpeg-core.js'), join(dst, 'ffmpeg-core.js'))
copyFileSync(join(coreDir, 'ffmpeg-core.wasm'), join(dst, 'ffmpeg-core.wasm'))

// Worker + its imports (from @ffmpeg/ffmpeg) — served directly so the browser
// creates the Worker from a known URL, bypassing webpack's broken resolution
// of `new URL('./worker.js', import.meta.url)` in dynamically imported modules.
copyFileSync(join(workerDir, 'worker.js'), join(dst, 'worker.js'))
copyFileSync(join(workerDir, 'const.js'), join(dst, 'const.js'))
copyFileSync(join(workerDir, 'errors.js'), join(dst, 'errors.js'))

console.log('✓ ffmpeg files copied to public/ffmpeg/')
