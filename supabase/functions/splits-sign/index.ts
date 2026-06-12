import { requireAuth } from '../_shared/auth.ts'
import { db } from '../_shared/db.ts'
import { sendEmail } from '../_shared/resend.ts'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function buildPdf(params: {
  projectTitle: string
  trackTitle: string
  dateStr: string
  splits: Array<{ name: string; percentage: number; signedAt: string; signedIp: string }>
  docId: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page = pdfDoc.addPage([595, 842])
  const { height } = page.getSize()
  const margin = 60
  const lineH = 18
  let y = height - margin

  function drawText(text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number]; indent?: number }) {
    page.drawText(text, { x: margin + (opts.indent ?? 0), y, size: opts.size ?? 10, font: opts.bold ? boldFont : font, color: opts.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0) })
  }
  function drawLine() {
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: 535, y: y + 4 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
    y -= lineH
  }
  function skip(n = 1) { y -= lineH * n }

  drawText('BS-PASS', { bold: true, size: 18 }); skip()
  drawText('SPLITS AGREEMENT', { bold: true, size: 13, color: [0.3, 0.3, 0.3] }); skip(1.5)
  drawLine(); skip(0.5)
  drawText('Project', { bold: true, size: 9, color: [0.5, 0.5, 0.5] }); skip()
  drawText(params.projectTitle, { size: 11 }); skip(1.2)
  drawText('Track', { bold: true, size: 9, color: [0.5, 0.5, 0.5] }); skip()
  drawText(params.trackTitle, { size: 11 }); skip(1.2)
  drawText('Generated', { bold: true, size: 9, color: [0.5, 0.5, 0.5] }); skip()
  drawText(params.dateStr, { size: 10 }); skip(1.5)
  drawLine(); skip(0.5)
  drawText('AGREED SPLITS', { bold: true, size: 11 }); skip(1.2)
  drawText('PARTY', { bold: true, size: 9, color: [0.5, 0.5, 0.5] })
  page.drawText('SHARE', { x: 300, y, size: 9, font: boldFont, color: rgb(0.5, 0.5, 0.5) })
  page.drawText('SIGNED', { x: 420, y, size: 9, font: boldFont, color: rgb(0.5, 0.5, 0.5) })
  skip(1.2)
  for (const s of params.splits) {
    drawText(s.name, { size: 10 })
    page.drawText(`${s.percentage.toFixed(2)}%`, { x: 300, y, size: 10, font, color: rgb(0, 0, 0) })
    page.drawText(s.signedAt, { x: 420, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) })
    skip()
  }
  skip(0.5); drawLine(); skip(0.5)
  drawText('SIGNATURE LOG', { bold: true, size: 11 }); skip(1.2)
  for (const s of params.splits) {
    drawText(s.name, { bold: true, size: 9 }); skip()
    drawText(`Signed: ${s.signedAt}  |  IP: ${s.signedIp}`, { size: 9, color: [0.4, 0.4, 0.4], indent: 10 }); skip(1.2)
  }
  drawLine(); skip(0.5)
  drawText('This document is an informal record of consent. Not a legally certified e-signature.', { size: 8, color: [0.5, 0.5, 0.5] }); skip()
  drawText(`Document ID: ${params.docId}`, { size: 8, color: [0.7, 0.7, 0.7] })

  return pdfDoc.save()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { userId } = await requireAuth(req)
    const { token } = await req.json() as { token: string }

    if (!token) return json({ error: 'token is required' }, 400)

    const supabase = db()

    // Load split by token
    const { data: split } = await supabase
      .from('splits')
      .select(`
        id,
        track_id,
        collaborator_id,
        percentage,
        split_status,
        signature_token,
        token_expires_at,
        signed_at,
        collaborators!inner(
          user_id,
          project_id,
          profiles:user_id(display_name)
        )
      `)
      .eq('signature_token', token)
      .maybeSingle()

    if (!split) return json({ error: 'Invalid or expired token' }, 404)

    // Token expiry check
    if (split.token_expires_at && new Date(split.token_expires_at) < new Date()) {
      return json({ error: 'This signing link has expired. Please ask the project owner to resend signatures.' }, 410)
    }

    // Already signed
    if (split.signed_at || split.split_status === 'signed') {
      return json({ error: 'This split has already been signed.' }, 409)
    }

    // Voided
    if (split.split_status === 'voided') {
      return json({ error: 'This signature request has been voided. The splits may have changed.' }, 410)
    }

    const collab = split.collaborators as { user_id: string; project_id: string; profiles: { display_name: string } | null }

    // Verify the logged-in user matches the token recipient
    if (collab.user_id !== userId) {
      return json({ error: 'This signing link is not for your account.' }, 403)
    }

    // Record the client IP (best-effort from headers)
    const signedIp = req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    // Atomic update: only succeeds if signed_at is still null (guards concurrent signing)
    const { data: updated } = await supabase
      .from('splits')
      .update({
        signed_at: new Date().toISOString(),
        signed_ip: signedIp,
        split_status: 'signed',
        signature_token: null,
        token_expires_at: null,
      })
      .eq('id', split.id)
      .is('signed_at', null)
      .select('id')

    if (!updated || updated.length === 0) {
      return json({ error: 'This split has already been signed.' }, 409)
    }

    const signerName = collab.profiles?.display_name ?? 'A collaborator'

    // Load track info
    const { data: track } = await supabase
      .from('tracks')
      .select('title,project_id')
      .eq('id', split.track_id)
      .single()

    // Post to chat
    if (track) {
      await supabase.from('chat_messages').insert({
        project_id: track.project_id,
        sender_type: 'agent',
        body: `${signerName} has signed the splits agreement for "${track.title}" (${split.percentage}%). `,
      })
    }

    // Check if ALL splits for this track are now signed
    const { data: allSplits } = await supabase
      .from('splits')
      .select('id,split_status')
      .eq('track_id', split.track_id)

    const allSigned = allSplits && allSplits.length > 0 && allSplits.every(s => s.split_status === 'signed')

    if (allSigned && track) {
      await supabase.from('chat_messages').insert({
        project_id: track.project_id,
        sender_type: 'agent',
        body: `All parties have signed the splits agreement for "${track.title}". Generating PDF and emailing all parties now.`,
      })

      // Load full split details for PDF
      const { data: fullSplits } = await supabase
        .from('splits')
        .select('percentage,signed_at,signed_ip,collaborators!inner(user_id,profiles:user_id(display_name))')
        .eq('track_id', split.track_id)

      const { data: project } = await supabase
        .from('projects').select('title').eq('id', track.project_id).single()

      if (fullSplits && project) {
        const splitRows = fullSplits.map(s => {
          const c = s.collaborators as { user_id: string; profiles: { display_name: string } | null }
          return {
            name: c.profiles?.display_name ?? 'Unknown',
            percentage: Number(s.percentage),
            signedAt: s.signed_at ? new Date(s.signed_at).toLocaleDateString('en-US') : 'N/A',
            signedIp: s.signed_ip ?? 'N/A',
            userId: c.user_id,
          }
        })

        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        const docId = crypto.randomUUID()
        const pdfBytes = await buildPdf({ projectTitle: project.title, trackTitle: track.title, dateStr, splits: splitRows, docId })
        const filename = `splits-${track.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`

        const userIds = splitRows.map(s => s.userId)
        const { data: authRows } = await supabase.rpc('get_emails_by_user_ids', { p_user_ids: userIds })
        const signeeEmails = (authRows as Array<{ id: string; email: string }> ?? []).map(r => r.email)

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px;">Splits Agreement — Fully Signed</h2>
  <p style="color:#555;margin-bottom:16px;">All parties have signed the splits agreement for <strong>${track.title}</strong> from <strong>${project.title}</strong>.</p>
  <p style="color:#555;margin-bottom:24px;">Your copy of the finalized agreement is attached to this email.</p>
  <p style="color:#888;font-size:13px;">This document is an informal record of consent and is not a legally certified e-signature.</p>
  <p style="color:#bbb;font-size:12px;margin-top:32px;">BS-PASS · AI-powered music project management</p>
</body></html>`

        for (const email of signeeEmails) {
          await sendEmail({
            to: email,
            subject: `Splits Agreement Finalized — ${track.title}`,
            html,
            text: `All parties have signed the splits agreement for "${track.title}". Your copy is attached.`,
            attachments: [{ filename, content: Array.from(pdfBytes), type: 'application/pdf' }],
          }).catch(e => console.warn(`PDF email to ${email} failed:`, e))
        }
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      project_id: track?.project_id ?? collab.project_id,
      actor_id: userId,
      actor_type: 'user',
      entity_type: 'splits',
      entity_id: split.id,
      action: 'split_signed',
      diff: { track_id: split.track_id, percentage: split.percentage, signed_ip: signedIp },
    })

    return json({ success: true, all_signed: allSigned })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('splits-sign unhandled:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
