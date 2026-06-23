import { db } from '../_shared/db.ts'
import { requireAuth } from '../_shared/auth.ts'
import { CORS } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'


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
    const body = await req.json()
    const { type } = body

    if (!type) return json({ error: 'type is required' }, 400)

    const supabase = db()

    // ── collaborator_invite ──────────────────────────────────────────────────
    if (type === 'collaborator_invite') {
      const { projectId, email, roles } = body as {
        projectId: string
        email: string
        roles: string[]
      }

      if (!projectId || !email) return json({ error: 'projectId and email are required' }, 400)

      // Verify caller is the main artist
      const { data: callerCollab } = await supabase
        .from('collaborators')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('is_main_artist', true)
        .is('removed_at', null)
        .maybeSingle()

      if (!callerCollab) return json({ error: 'Only the main artist can invite collaborators' }, 403)

      // Load project + caller name
      const { data: project } = await supabase
        .from('projects')
        .select('id,title')
        .eq('id', projectId)
        .single()
      if (!project) return json({ error: 'Project not found' }, 404)

      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single()
      const callerName = callerProfile?.display_name ?? 'The project owner'

      const normalizedEmail = email.trim().toLowerCase()
      const roleLabel = (roles ?? []).join(', ') || 'Collaborator'
      const token = crypto.randomUUID()

      // Check if this email belongs to a registered user via SQL helper (avoids paginated listUsers)
      const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', { p_email: normalizedEmail })
      const existingUser = existingUserId ? { id: existingUserId as string } : null

      let inviteUrl: string

      if (existingUser) {
        // Registered user: create collaborator row with invite_token
        const existingProfile = existingUser.id

        // Check if already a collaborator
        const { data: existing } = await supabase
          .from('collaborators')
          .select('id,status,removed_at')
          .eq('project_id', projectId)
          .eq('user_id', existingProfile)
          .maybeSingle()

        if (existing && existing.removed_at === null && existing.status !== 'removed') {
          return json({ error: 'This person is already a collaborator on this project' }, 409)
        }

        if (existing) {
          // Re-invite: update with new token
          await supabase
            .from('collaborators')
            .update({
              roles: roles ?? [],
              status: 'invited',
              invite_token: token,
              invited_at: new Date().toISOString(),
              accepted_at: null,
              removed_at: null,
            })
            .eq('id', existing.id)
        } else {
          await supabase.from('collaborators').insert({
            project_id: projectId,
            user_id: existingProfile,
            roles: roles ?? [],
            status: 'invited',
            is_main_artist: false,
            invite_token: token,
          })
        }

        inviteUrl = `${APP_BASE}/invite/${token}`
      } else {
        // Unregistered user: create/upsert pending_invite
        const { data: existingPending } = await supabase
          .from('pending_invites')
          .select('id')
          .eq('project_id', projectId)
          .eq('email', normalizedEmail)
          .is('accepted_at', null)
          .maybeSingle()

        if (existingPending) {
          // Resend: refresh token + expiry
          await supabase
            .from('pending_invites')
            .update({
              roles: roles ?? [],
              invite_token: token,
              invited_by: userId,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', existingPending.id)
        } else {
          await supabase.from('pending_invites').insert({
            project_id: projectId,
            email: normalizedEmail,
            roles: roles ?? [],
            invite_token: token,
            invited_by: userId,
          })
        }

        inviteUrl = `${APP_BASE}/invite/${token}`
      }

      // Send invite email
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">You've been invited to collaborate</h2>
  <p style="color: #555; margin-bottom: 24px;">${callerName} has invited you to join <strong>${project.title}</strong> on BS-PASS as <strong>${roleLabel}</strong>.</p>
  <a href="${inviteUrl}" style="display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 24px;">
    View Invitation →
  </a>
  <p style="color: #888; font-size: 13px;">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
  <p style="color: #bbb; font-size: 12px; margin-top: 32px;">BS-PASS · AI-powered music project management</p>
</body>
</html>`

      await sendEmail({
        to: normalizedEmail,
        subject: `${callerName} invited you to collaborate on "${project.title}"`,
        html,
        text: `${callerName} invited you to join "${project.title}" on BS-PASS as ${roleLabel}. Accept here: ${inviteUrl}`,
      })

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        actor_id: userId,
        actor_type: 'user',
        entity_type: 'collaborators',
        action: 'collaborator_invited',
        diff: { email: normalizedEmail, roles, registered: !!existingUser },
      })

      return json({ success: true })
    }

    // ── pdf_ready — email PDF as attachment to all signees ──────────────────
    if (type === 'pdf_ready') {
      const { trackId, pdfBase64, pdfFilename } = body as {
        trackId: string
        pdfBase64: string
        pdfFilename: string
      }

      if (!trackId || !pdfBase64) return json({ error: 'trackId and pdfBase64 are required' }, 400)

      const { data: track } = await supabase
        .from('tracks')
        .select('id,title,project_id')
        .eq('id', trackId)
        .single()
      if (!track) return json({ error: 'Track not found' }, 404)

      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', track.project_id)
        .single()

      // Get all signed collaborators for this track with their emails
      const { data: splits } = await supabase
        .from('splits')
        .select('collaborator_id,collaborators!inner(user_id,profiles:user_id(display_name))')
        .eq('track_id', trackId)
        .eq('split_status', 'signed')

      if (!splits || splits.length === 0) return json({ error: 'No signed splits found' }, 400)

      const userIds = splits.map(s => (s.collaborators as { user_id: string }).user_id)

      const { data: authRows } = await supabase.rpc('get_emails_by_user_ids', { p_user_ids: userIds })
      const signeeEmails = (authRows as Array<{ id: string; email: string }> ?? []).map(r => r.email)

      if (signeeEmails.length === 0) return json({ error: 'No signee emails found' }, 400)

      const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 8px;">Splits Agreement — All Signatures Collected</h2>
  <p style="color: #555; margin-bottom: 16px;">All parties have signed the splits agreement for <strong>${track.title}</strong> from <strong>${project?.title}</strong>.</p>
  <p style="color: #555; margin-bottom: 24px;">Your copy of the finalized agreement is attached to this email.</p>
  <p style="color: #888; font-size: 13px;">This document serves as an informal record of consent. For legally binding agreements, consult a music attorney.</p>
  <p style="color: #bbb; font-size: 12px; margin-top: 32px;">BS-PASS · AI-powered music project management</p>
</body>
</html>`

      // Send to all signees with PDF attachment
      for (const email of signeeEmails) {
        await sendEmail({
          to: email,
          subject: `Splits Agreement Ready — ${track.title}`,
          html,
          text: `All parties have signed the splits agreement for "${track.title}". Your copy is attached.`,
          attachments: [{
            filename: pdfFilename ?? `splits-${track.title.replace(/\s+/g, '-')}.pdf`,
            content: Array.from(pdfBytes),
            type: 'application/pdf',
          }],
        })
      }

      return json({ success: true, sent_to: signeeEmails.length })
    }

    return json({ error: `Unknown type: ${type}` }, 400)

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('notifications-send-email unhandled:', msg, err)
    return json({ error: msg }, 500)
  }
})
