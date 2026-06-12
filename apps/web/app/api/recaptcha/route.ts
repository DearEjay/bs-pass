import { NextResponse } from 'next/server'

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY ?? ''
const MIN_SCORE = 0.5

export async function POST(req: Request) {
  if (!RECAPTCHA_SECRET) {
    // reCAPTCHA not configured — allow through (dev mode)
    return NextResponse.json({ success: true, score: 1 })
  }

  const { token } = await req.json()
  if (!token) return NextResponse.json({ success: false, error: 'missing_token' }, { status: 400 })

  const params = new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token })
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await res.json() as { success: boolean; score: number; 'error-codes'?: string[] }

  if (!data.success || data.score < MIN_SCORE) {
    return NextResponse.json({ success: false, score: data.score, errors: data['error-codes'] }, { status: 400 })
  }

  return NextResponse.json({ success: true, score: data.score })
}
