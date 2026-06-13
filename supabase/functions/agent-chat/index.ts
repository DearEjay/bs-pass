import { requireAuth } from '../_shared/auth.ts'
import { db } from '../_shared/db.ts'
import { generateContent } from '../_shared/gemini.ts'
import { buildAgentContext, formatContextForPrompt } from '../_shared/context.ts'

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
    const { projectId, messageId } = await req.json()
    if (!projectId || !messageId) return json({ error: 'projectId and messageId required' }, 400)

    const supabase = db()

    // Verify caller is a collaborator
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('removed_at', null)
      .maybeSingle()
    if (!collab) return json({ error: 'Forbidden' }, 403)

    // Fetch the triggering message
    const { data: triggerMsg } = await supabase
      .from('chat_messages')
      .select('body, sender_id, profiles:sender_id(display_name, full_name)')
      .eq('id', messageId)
      .single()
    if (!triggerMsg) return json({ error: 'Message not found' }, 404)

    const senderProfile = triggerMsg.profiles as { display_name: string | null; full_name: string | null } | null
    const senderName = senderProfile?.full_name ?? senderProfile?.display_name ?? 'Someone'

    // Fetch last 20 chat messages for conversation context (excluding agent system messages)
    const { data: recentMsgs } = await supabase
      .from('chat_messages')
      .select('body, sender_type, sender_id, profiles:sender_id(display_name, full_name), created_at')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const history = (recentMsgs ?? [])
      .reverse()
      .map(m => {
        if (m.sender_type === 'agent') return `[Manager]: ${m.body}`
        const p = m.profiles as { display_name: string | null; full_name: string | null } | null
        const name = p?.full_name ?? p?.display_name ?? 'User'
        return `[${name}]: ${m.body}`
      })
      .join('\n')

    // Build project context
    const ctx = await buildAgentContext(projectId, userId)
    const contextBlock = formatContextForPrompt(ctx)

    const prompt = `You are the AI manager for this music project, speaking directly in the project's group chat.
You have full knowledge of the project state below. Be conversational, helpful, and concise.
If someone asks you to help with something like writing a bio, press kit, or creative content — do it directly in chat or ask targeted follow-up questions to gather what you need.
Never say you can't do something — you are a capable music industry AI manager.

=== PROJECT CONTEXT ===
${contextBlock}

=== RECENT CHAT HISTORY ===
${history}

=== CURRENT MESSAGE FROM ${senderName.toUpperCase()} ===
${triggerMsg.body}

Respond naturally as the AI manager. Keep your reply focused and under 400 words unless the user explicitly asked for something long (like a bio). If you need more information to complete a task, ask up to 2 specific questions — not a long questionnaire.`

    const reply = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])

    // Post the reply to chat
    const { error: insertErr } = await supabase.from('chat_messages').insert({
      project_id: projectId,
      sender_type: 'agent',
      body: reply.trim(),
    })
    if (insertErr) {
      console.error('Failed to post agent reply:', insertErr)
      return json({ error: 'Failed to post reply' }, 500)
    }

    return json({ success: true })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-chat unhandled:', msg)
    return json({ error: msg }, 500)
  }
})
