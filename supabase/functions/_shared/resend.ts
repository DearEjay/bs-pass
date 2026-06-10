const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'ejaymallard@gmail.com'
const FROM_NAME = 'BS-PASS'

export interface EmailAttachment {
  filename: string
  content: number[] | string
  type?: string
}

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to]

  const body: Record<string, unknown> = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: toAddresses.map(email => ({ email })),
    subject: payload.subject,
    htmlContent: payload.html,
    textContent: payload.text,
  }

  if (payload.attachments?.length) {
    body.attachment = payload.attachments.map(a => ({
      name: a.filename,
      content: typeof a.content === 'string'
        ? a.content
        : btoa(String.fromCharCode(...(a.content as number[]))),
    }))
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Brevo error ${res.status}: ${JSON.stringify(err)}`)
  }
}
