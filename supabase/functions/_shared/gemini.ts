const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const MODEL = 'gemini-2.0-flash'
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function generateContent(messages: GeminiMessage[]): Promise<string> {
  const res = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: messages }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.candidates[0].content.parts[0].text as string
}
