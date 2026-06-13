const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Model tiers — pick based on task complexity and expected input size:
//   FAST  (llama-3.1-8b-instant)    : 6K TPM,  500K TPD — lightweight tasks, short prompts
//   SMART (llama-3.3-70b-versatile) : 12K TPM, 100K TPD — complex reasoning, large user messages
export const GROQ_FAST  = 'llama-3.1-8b-instant'
export const GROQ_SMART = 'llama-3.3-70b-versatile'

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function generateContent(
  messages: GeminiMessage[],
  model = GROQ_SMART,
): Promise<string> {
  // Map Gemini message format → OpenAI/Groq format
  const mapped = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.parts.map(p => p.text).join(''),
  }))

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages: mapped }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}
