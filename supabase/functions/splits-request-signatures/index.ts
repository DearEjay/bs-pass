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

const APP_BASE = Deno.env.get('APP_BASE_URL') ?? 'https://bspass.vercel.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { userId } = await requireAuth(req)
    const { trackId } = await req.json() as { trackId: string }

    if (!trackId) return json({ error: 'trackId is required' }, 400)

    const supabase = db()

    // Load track + project
    const { data: track } = await supabase
      .from('tracks')
      .select('id,title,project_id')
      .eq('id', trackId)
      .single()
    if (!track) return json({ error: 'Track not found' }, 404)

    // Verify caller is main artist
    const { data: callerCollab } = await supabase
      .from('collaborators')
      .select('id,is_main_artist,profiles:user_id(display_name)')
      .eq('project_id', track.project_id)
      .eq('user_id', userId)
      .eq('is_main_artist', true)
      .is('removed_at', null)
      .maybeSingle()
    if (!callerCollab) return json({ error: 'Only the main artist can request signatures' }, 403)

    const artistName = (callerCollab.profiles as { display_name: string } | null)?.display_name ?? 'The artist'

    const { data: project } = await supabase
      .from('projects')
      .select('title')
      .eq('id', track.project_id)
      .single()

    // Load all splits for this track
    const { data: splits } = await supabase
      .from('splits')
      .select('id,collaborator_id,percentage,collaborators!inner(user_id,profiles:user_id(display_name))')
      .eq('track_id', trackId)
    if (!splits || splits.length === 0) return json({ error: 'No splits configured for this track' }, 400)

    // 100% sum validation (exact to 2 decimal places)
    const total = splits.reduce((sum, s) => sum + Number(s.percentage), 0)
    if (Math.round(total * 100) !== 10000) {
      return json({ error: `Split percentages must total 100% (currently ${total.toFixed(2)}%)` }, 422)
    }

    // Generate token + expiry per split, reset any existing signatures
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const updatedSplits: Array<{ id: string; token: string; user_id: string; display_name: string; percentage: number }> = []

    for (const split of splits) {
      const token = crypto.randomUUID()
      await supabase
        .from('splits')
        .update({
          signature_token: token,
          token_expires_at: tokenExpiry,
          signed_at: null,
          signed_ip: null,
          split_status: 'pending',
        })
        .eq('id', split.id)

      const collab = split.collaborators as { user_id: string; profiles: { display_name: string } | null }
      updatedSplits.push({
        id: split.id,
        token,
        user_id: collab.user_id,
        display_name: collab.profiles?.display_name ?? 'Collaborator',
        percentage: Number(split.percentage),
      })
    }

    // Fetch emails for all collaborators via profiles → auth.users lookup
    const userIds = updatedSplits.map(s => s.user_id)
    const { data: authRows } = await supabase.rpc('get_emails_by_user_ids', { p_user_ids: userIds })
    const userMap = new Map<string, string>(
      (authRows as Array<{ id: string; email: string }> ?? []).map(r => [r.id, r.email])
    )

    // Build @mentions for chat
    const mentions = updatedSplits.map(s => s.display_name).join(', ')

    let emailsSent = 0
    for (const split of updatedSplits) {
      const email = userMap.get(split.user_id)
      if (!email) {
        console.warn(`splits-request-signatures: no email found for user_id=${split.user_id} (${split.display_name}) — skipping`)
        continue
      }

      const signUrl = `${APP_BASE}/splits/sign/${split.token}`
      const otherParties = updatedSplits
        .filter(s => s.user_id !== split.user_id)
        .map(s => `${s.display_name}: ${s.percentage}%`)
        .join('\n')

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Action Required: Review & Sign Splits</h2>
  <p style="color: #555; margin-bottom: 8px;">${artistName} is requesting your signature on the splits agreement for <strong>${track.title}</strong> from <strong>${project?.title ?? 'the project'}</strong>.</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0 0 8px; font-weight: 600;">Your share: ${split.percentage}%</p>
    ${otherParties ? `<p style="margin: 0; color: #666; font-size: 13px; white-space: pre-line;">${otherParties}</p>` : ''}
  </div>
  <a href="${signUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
    Review &amp; Sign →
  </a>
  <p style="color: #888; font-size: 13px;">This link expires in 7 days and is single-use. By signing you confirm the percentage split shown above.</p>
  <p style="color: #bbb; font-size: 12px; margin-top: 32px;">BS-PASS · AI-powered music project management</p>
</body>
</html>`

      await sendEmail({
        to: email,
        subject: `Sign Required: Splits for "${track.title}"`,
        html,
        text: `${artistName} is requesting your signature on the splits for "${track.title}". Your share: ${split.percentage}%. Sign here: ${signUrl}`,
      })
      emailsSent++
    }

    // Post to chat
    await supabase.from('chat_messages').insert({
      project_id: track.project_id,
      sender_type: 'agent',
      body: `Signature request sent to ${mentions} for the splits agreement on "${track.title}". Each collaborator has received an email with their signing link.`,
    })

    // Audit log
    await supabase.from('audit_logs').insert({
      project_id: track.project_id,
      actor_id: userId,
      actor_type: 'user',
      entity_type: 'splits',
      entity_id: trackId,
      action: 'signature_request_sent',
      diff: { track_id: trackId, splits_count: splits.length, emails_sent: emailsSent, missing_emails: splits.length - emailsSent },
    })

    return json({ success: true, emails_sent: emailsSent })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('splits-request-signatures unhandled:', msg, err)
    return json({ error: msg }, 500)
  }
})
