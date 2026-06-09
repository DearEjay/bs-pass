import { Resend } from 'resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
const FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'BS-PASS <noreply@bspass.com>'

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}
