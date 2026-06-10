import { requireAuth } from '../_shared/auth.ts'
import { db } from '../_shared/db.ts'
import { sendEmail } from '../_shared/resend.ts'

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

// Generate a minimal but complete PDF without external libraries (raw PDF syntax)
function buildPdf(content: string[][]): Uint8Array {
  const lines: string[] = []
  const pageWidth = 595
  const pageHeight = 842
  const margin = 60
  const lineHeight = 20

  // Flatten content into positioned text objects
  const textObjects: string[] = []
  let y = pageHeight - margin
  for (const row of content) {
    for (let i = 0; i < row.length; i++) {
      const x = i === 0 ? margin : margin + 300
      textObjects.push(`BT /F1 ${row.length === 1 && i === 0 ? '13' : '10'} Tf ${x} ${y} Td (${escape(row[i])}) Tj ET`)
    }
    y -= lineHeight
    if (row.length > 0 && row[0] === '') y -= lineHeight / 2 // blank line spacing
  }

  const streamContent = textObjects.join('\n')
  const streamBytes = new TextEncoder().encode(streamContent)

  // Build PDF objects
  const objs: string[] = []
  objs.push('%PDF-1.4')
  const offsets: number[] = []
  let offset = objs[0].length + 1

  function addObj(n: number, body: string) {
    const s = `${n} 0 obj\n${body}\nendobj\n`
    offsets[n] = offset
    offset += new TextEncoder().encode(s).length
    objs.push(s)
  }

  // 1: Catalog
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  // 2: Pages
  addObj(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`)
  // 3: Page
  addObj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`)
  // 4: Content stream
  const streamHeader = `<< /Length ${streamBytes.length} >>`
  objs.push(`4 0 obj\n${streamHeader}\nstream\n`)
  offsets[4] = offset
  offset += new TextEncoder().encode(`4 0 obj\n${streamHeader}\nstream\n`).length + streamBytes.length + '\nendstream\nendobj\n'.length
  // 5: Font
  addObj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const xrefOffset = offset
  const header = objs.join('')
  const xref = [
    'xref',
    `0 ${offsets.length}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n '),
  ].join('\n')
  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const enc = new TextEncoder()
  const parts: Uint8Array[] = [
    enc.encode(header),
    streamBytes,
    enc.encode('\nendstream\nendobj\n'),
    enc.encode(xref + '\n' + trailer),
  ]
  const totalLen = parts.reduce((s, p) => s + p.length, 0)
  const result = new Uint8Array(totalLen)
  let pos = 0
  for (const p of parts) { result.set(p, pos); pos += p.length }
  return result
}

function escape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { userId } = await requireAuth(req)
    const url = new URL(req.url)
    const trackId = req.method === 'GET'
      ? url.searchParams.get('trackId')
      : (await req.json() as { trackId: string }).trackId

    if (!trackId) return json({ error: 'trackId is required' }, 400)

    const supabase = db()

    // Load track
    const { data: track } = await supabase
      .from('tracks')
      .select('id,title,project_id')
      .eq('id', trackId)
      .single()
    if (!track) return json({ error: 'Track not found' }, 404)

    // Verify caller is a collaborator
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id,is_main_artist')
      .eq('project_id', track.project_id)
      .eq('user_id', userId)
      .is('removed_at', null)
      .maybeSingle()
    if (!collab) return json({ error: 'Forbidden' }, 403)

    // Load project
    const { data: project } = await supabase
      .from('projects')
      .select('title')
      .eq('id', track.project_id)
      .single()

    // Load all splits with collaborator info
    const { data: splits } = await supabase
      .from('splits')
      .select('id,percentage,split_status,signed_at,signed_ip,collaborators!inner(user_id,profiles:user_id(display_name))')
      .eq('track_id', trackId)

    if (!splits || splits.length === 0) return json({ error: 'No splits found for this track' }, 400)

    // All must be signed
    const allSigned = splits.every(s => s.split_status === 'signed')
    if (!allSigned) {
      return json({ error: 'All parties must sign before the PDF can be generated' }, 422)
    }

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    // Build PDF content
    const content: string[][] = [
      ['BS-PASS — SPLITS AGREEMENT'],
      [''],
      [`Project: ${project?.title ?? 'Unknown'}`],
      [`Track: ${track.title}`],
      [`Generated: ${dateStr}`],
      [''],
      ['─────────────────────────────────────────'],
      [''],
      ['REVENUE SPLIT AGREEMENT'],
      [''],
      ['The parties listed below agree to the following revenue split for the'],
      [`track "${track.title}" as part of the project "${project?.title ?? ''}".`],
      [''],
      ['AGREED SPLITS:'],
      [''],
      ...splits.map(s => {
        const c = s.collaborators as { user_id: string; profiles: { display_name: string } | null }
        const name = c.profiles?.display_name ?? 'Unknown'
        const signedDate = s.signed_at ? new Date(s.signed_at).toLocaleDateString('en-US') : 'N/A'
        return [`${name}`, `${Number(s.percentage).toFixed(2)}% — Signed ${signedDate}`]
      }),
      [''],
      ['─────────────────────────────────────────'],
      [''],
      ['SIGNATURES:'],
      [''],
      ...splits.map(s => {
        const c = s.collaborators as { user_id: string; profiles: { display_name: string } | null }
        const name = c.profiles?.display_name ?? 'Unknown'
        const signedDate = s.signed_at ? new Date(s.signed_at).toLocaleString('en-US') : 'N/A'
        return [`${name}`, `Signed: ${signedDate} | IP: ${s.signed_ip ?? 'N/A'}`]
      }),
      [''],
      ['─────────────────────────────────────────'],
      [''],
      ['DISCLAIMER: This document is an informal record of consent generated by'],
      ['BS-PASS. It is not a legally certified e-signature. For legally binding'],
      ['agreements, consult a music attorney.'],
      [''],
      [`Document ID: ${crypto.randomUUID()}`],
    ]

    const pdfBytes = buildPdf(content)
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes))

    const filename = `splits-${track.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`

    // Email PDF as attachment to all signees
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const userIds = splits.map(s => (s.collaborators as { user_id: string }).user_id)
    const signeeEmails = users.filter(u => userIds.includes(u.id) && u.email).map(u => u.email as string)

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Splits Agreement — All Signatures Collected</h2>
  <p style="color: #555; margin-bottom: 16px;">All parties have signed the splits agreement for <strong>${track.title}</strong> from <strong>${project?.title ?? 'the project'}</strong>.</p>
  <p style="color: #555; margin-bottom: 24px;">Your copy of the finalized agreement is attached to this email.</p>
  <p style="color: #888; font-size: 13px;">This document is an informal record of consent and is not a legally certified e-signature.</p>
  <p style="color: #bbb; font-size: 12px; margin-top: 32px;">BS-PASS · AI-powered music project management</p>
</body>
</html>`

    for (const email of signeeEmails) {
      await sendEmail({
        to: email,
        subject: `Splits Agreement Ready — ${track.title}`,
        html,
        text: `All parties have signed the splits agreement for "${track.title}". Your copy is attached.`,
        attachments: [{
          filename,
          content: Array.from(pdfBytes),
          type: 'application/pdf',
        }],
      }).catch(e => console.warn(`PDF email to ${email} failed:`, e))
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      project_id: track.project_id,
      actor_id: userId,
      actor_type: 'user',
      entity_type: 'splits',
      entity_id: trackId,
      action: 'pdf_generated',
      diff: { track_id: trackId, filename },
    })

    // Return PDF bytes directly for browser download
    return new Response(pdfBytes, {
      headers: {
        ...CORS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
      },
    })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('splits-generate-pdf unhandled:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
