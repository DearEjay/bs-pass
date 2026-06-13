import { requireAuth } from '../_shared/auth.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Joanna — Amazon Polly neural US-English female voice via StreamElements
    const ttsRes = await fetch(
      `https://api.streamelements.com/kappa/v2/speech?voice=Joanna&text=${encodeURIComponent(text.slice(0, 1000))}`
    )

    if (!ttsRes.ok) {
      return new Response(JSON.stringify({ error: 'TTS service unavailable' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const audio = await ttsRes.arrayBuffer()
    return new Response(audio, {
      headers: { ...CORS, 'Content-Type': 'audio/mpeg' },
    })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
