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

interface TaskDraft {
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  start_date: string | null
  due_date: string | null
  assignee_role: string | null
}

interface AgentResponse {
  reply: string
  tasks?: TaskDraft[]
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

    // Fetch last 20 chat messages for conversation context
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

    // Build project context for role-to-userId assignment
    const ctx = await buildAgentContext(projectId, userId)
    const contextBlock = formatContextForPrompt(ctx)

    const roleToUserId: Record<string, string> = {}
    for (const c of ctx.collaborators) {
      for (const role of c.roles) {
        if (!roleToUserId[role]) roleToUserId[role] = c.userId
      }
    }

    const today = ctx.project.today

    const prompt = `You are the AI manager for this music project, speaking directly in the group chat.
You can read and write tasks to the roadmap. ALWAYS act immediately on clear requests — do NOT ask follow-up questions unless the user explicitly says "ask me" or the request is so vague you have zero information to act on.

DEFAULT BEHAVIOUR:
- Task requests → create the tasks NOW, confirm in chat what was done (1–2 sentences max)
- Creative requests (bio, press kit, etc.) → produce the content directly in chat
- Questions → answer them
- Only ask follow-up questions if the user says "ask me questions" or gives truly zero actionable info

=== PROJECT CONTEXT ===
${contextBlock}

=== RECENT CHAT HISTORY ===
${history}

=== CURRENT MESSAGE FROM ${senderName.toUpperCase()} ===
${triggerMsg.body}

Return ONLY valid JSON (no markdown, no code fences):
{
  "reply": "<short confirmation or content — 1-3 sentences for actions, longer only for creative content>",
  "tasks": [
    {
      "title": "<task title>",
      "description": "<description or null>",
      "priority": "high" | "medium" | "low",
      "start_date": "YYYY-MM-DD or null",
      "due_date": "YYYY-MM-DD or null",
      "assignee_role": "<role string matching collaborators list, or null>"
    }
  ]
}

Rules:
- "tasks" array is ONLY included when the user is asking to add/create tasks — omit the key entirely otherwise
- today is ${today}
- If the user specifies a deadline, set due_date accordingly; spread start/due dates evenly if multiple tasks
- priority defaults to "medium" unless context implies urgency
- assignee_role must exactly match a role from the COLLABORATORS list above, or null
- reply must NOT say "I'll add" or "I will" — say "Added" or "Done" (past tense, because the tasks are being created right now)`

    let parsed: AgentResponse = { reply: '' }

    try {
      const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.warn('agent-chat JSON parse failed:', e)
      // Fallback: treat raw output as plain reply
      const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
      parsed = { reply: raw.trim() }
    }

    // Create any tasks the agent produced
    let createdCount = 0
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      const rows = parsed.tasks.map((t, i) => ({
        project_id: projectId,
        title: String(t.title ?? `Task ${i + 1}`).slice(0, 200),
        description: t.description ?? null,
        priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
        start_date: t.start_date ?? null,
        due_date: t.due_date ?? null,
        assignee_id: t.assignee_role ? (roleToUserId[t.assignee_role] ?? null) : null,
        created_by: 'agent',
        sort_order: ctx.tasks.length + i,
      }))

      const { data: inserted, error: taskErr } = await supabase
        .from('tasks')
        .insert(rows)
        .select('id')

      if (taskErr) console.error('agent-chat task insert error:', taskErr)
      else createdCount = inserted?.length ?? 0
    }

    // Post the reply to chat
    const { error: insertErr } = await supabase.from('chat_messages').insert({
      project_id: projectId,
      sender_type: 'agent',
      body: parsed.reply?.trim() || (createdCount > 0 ? `Added ${createdCount} task${createdCount !== 1 ? 's' : ''} to the roadmap.` : 'Done.'),
    })

    if (insertErr) {
      console.error('Failed to post agent reply:', insertErr)
      return json({ error: 'Failed to post reply' }, 500)
    }

    return json({ success: true, tasks_created: createdCount })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-chat unhandled:', msg)
    return json({ error: msg }, 500)
  }
})
