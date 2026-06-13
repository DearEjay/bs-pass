import { requireAuth } from '../_shared/auth.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google TTS has a ~200 char per-request limit. Split on sentence boundaries.
function chunkText(text: string, maxLen = 180): string[] {
  if (text.length <= maxLen) return [text]
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text]
  const chunks: string[] = []
  let buf = ''
  for (const s of sentences) {
    const t = s.trim()
    if (!t) continue
    if (buf && (buf + ' ' + t).length > maxLen) {
      chunks.push(buf)
      buf = t
    } else {
      buf = buf ? `${buf} ${t}` : t
    }
  }
  if (buf) chunks.push(buf)
  return chunks
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    await requireAuth(req)

    const { text } = await req.json()
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const chunks = chunkText(text.slice(0, 1200))

    // Fetch each chunk from Google Translate TTS (server-to-server, no CORS issues)
    const buffers = await Promise.all(
      chunks.map(chunk =>
        fetch(
          `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
        ).then(r => {
          if (!r.ok) throw new Error(`Google TTS ${r.status}`)
          return r.arrayBuffer()
        })
      )
    )

    // Concatenate MP3 chunks into a single buffer
    const total = buffers.reduce((n, b) => n + b.byteLength, 0)
    const combined = new Uint8Array(total)
    let offset = 0
    for (const buf of buffers) {
      combined.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }

    return new Response(combined, {
      headers: { ...CORS, 'Content-Type': 'audio/mpeg' },
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('tts-speak error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
