import { sendEmail } from '../_shared/resend.ts'

Deno.serve(async (_req) => {
  try {
    await sendEmail({
      to: 'ejaymallard@gmail.com',
      subject: 'BS-PASS: Resend test',
      html: '<p>Resend is working correctly from a Supabase Edge Function.</p>',
      text: 'Resend is working correctly from a Supabase Edge Function.',
    })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
