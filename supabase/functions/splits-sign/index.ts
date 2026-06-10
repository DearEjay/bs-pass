import { requireAuth } from '../_shared/auth.ts'
import { db } from '../_shared/db.ts'

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

    // Record signature — nullify token (single-use)
    await supabase
      .from('splits')
      .update({
        signed_at: new Date().toISOString(),
        signed_ip: signedIp,
        split_status: 'signed',
        signature_token: null,
        token_expires_at: null,
      })
      .eq('id', split.id)

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
        body: `All parties have signed the splits agreement for "${track.title}". The main artist can now download the finalized PDF agreement from the Splits tab.`,
      })
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
