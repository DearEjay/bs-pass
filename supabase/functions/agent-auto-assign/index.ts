import { requireAuth } from '../_shared/auth.ts'
import { CORS } from '../_shared/cors.ts'
import { db } from '../_shared/db.ts'
import { generateContent, GROQ_FAST } from '../_shared/gemini.ts'


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
    const { projectId } = await req.json()
    if (!projectId) return json({ error: 'projectId required' }, 400)

    const supabase = db()

    // Verify caller is a collaborator
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id,is_main_artist')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('removed_at', null)
      .maybeSingle()

    if (!collab) return json({ error: 'Forbidden' }, 403)

    // Load incomplete tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id,title,description,priority,status')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .neq('status', 'complete')

    if (!tasks?.length) return json({ skipped: true, reason: 'No incomplete tasks' })

    // Load collaborators with roles
    const { data: collabs } = await supabase
      .from('collaborators')
      .select('user_id,roles,is_main_artist,profiles:user_id(display_name,full_name)')
      .eq('project_id', projectId)
      .is('removed_at', null)

    const collaborators = (collabs ?? []) as Array<{
      user_id: string
      roles: string[]
      is_main_artist: boolean
      profiles: { display_name: string | null; full_name: string | null } | null
    }>

    if (!collaborators.length) return json({ skipped: true, reason: 'No collaborators' })

    // Build role → user_id map
    const roleToUserId: Record<string, string> = {}
    for (const c of collaborators) {
      if (c.is_main_artist && !roleToUserId['main_artist']) roleToUserId['main_artist'] = c.user_id
      for (const role of c.roles ?? []) {
        if (!roleToUserId[role]) roleToUserId[role] = c.user_id
      }
    }

    const collaboratorList = collaborators.map(c => ({
      name: c.profiles?.full_name ?? c.profiles?.display_name ?? 'Unknown',
      user_id: c.user_id,
      roles: c.is_main_artist ? ['main_artist', ...(c.roles ?? [])] : (c.roles ?? []),
    }))

    const taskList = tasks.map(t => ({ id: t.id, title: t.title, description: t.description ?? null }))

    const prompt = `You are an AI music project manager. Assign these tasks to collaborators based on their roles.

RULES:
- Return ONLY a valid JSON array — no markdown, no code fences, no explanation
- Each element: { "task_id": string, "assignee_user_id": string|null }
- Only assign if there is a clear role match (e.g. mixing tasks → mixing_engineer, writing → songwriter)
- If no clear match, set assignee_user_id to null
- main_artist handles general project tasks, admin, approvals, and any task with no other clear owner
- Every task in the input must appear in the output (even if assignee_user_id is null)

COLLABORATORS:
${JSON.stringify(collaboratorList, null, 2)}

TASKS TO ASSIGN:
${JSON.stringify(taskList, null, 2)}`

    let assignments: Array<{ task_id: string; assignee_user_id: string | null }>

    try {
      const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }], GROQ_FAST)
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed)) throw new Error('not array')
      assignments = parsed
    } catch (e) {
      console.warn('LLM parse failed, falling back to role-based assignment:', e)
      // Simple rule-based fallback
      const ROLE_KEYWORDS: Array<[string, RegExp]> = [
        ['mixing_engineer', /\bmix/i],
        ['mastering_engineer', /\bmaster/i],
        ['recording_engineer', /\brecord/i],
        ['producer', /\bproduc/i],
        ['songwriter', /\bwrit|lyric|song/i],
        ['background_vocalist', /\bvocal|choir/i],
        ['manager', /\bmanag|releas|submit/i],
        ['graphic_designer', /\bartwork|cover|graphic|design/i],
        ['video_director', /\bvideo|visual|direct/i],
        ['marketing', /\bmarket|promo|social/i],
      ]
      assignments = tasks.map(t => {
        const text = `${t.title} ${t.description ?? ''}`
        for (const [role, pattern] of ROLE_KEYWORDS) {
          if (pattern.test(text) && roleToUserId[role]) {
            return { task_id: t.id, assignee_user_id: roleToUserId[role] }
          }
        }
        return { task_id: t.id, assignee_user_id: roleToUserId['main_artist'] ?? null }
      })
    }

    // Validate user IDs against known collaborators
    const validUserIds = new Set(collaborators.map(c => c.user_id))
    assignments = assignments.filter(a => !a.assignee_user_id || validUserIds.has(a.assignee_user_id))

    // Apply updates
    let updatedCount = 0
    const updatedTaskIds: string[] = []
    await Promise.all(assignments.map(async (a) => {
      if (!a.assignee_user_id) return
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: a.assignee_user_id })
        .eq('id', a.task_id)
        .eq('project_id', projectId)
      if (!error) {
        updatedCount++
        updatedTaskIds.push(a.task_id)
      }
    }))

    if (updatedCount === 0) return json({ success: true, updated: 0 })

    // Notify assignees via chat
    const { data: updatedTasks } = await supabase
      .from('tasks')
      .select('id,title,due_date,assignee_id,profiles:assignee_id(display_name,full_name)')
      .in('id', updatedTaskIds)
      .not('assignee_id', 'is', null)

    if (updatedTasks?.length) {
      const byAssignee = new Map<string, { name: string; tasks: Array<{ title: string; due_date: string | null }> }>()
      for (const t of updatedTasks) {
        if (!t.assignee_id) continue
        const p = t.profiles as { display_name: string | null; full_name: string | null } | null
        const name = p?.full_name ?? p?.display_name ?? 'there'
        if (!byAssignee.has(t.assignee_id)) byAssignee.set(t.assignee_id, { name, tasks: [] })
        byAssignee.get(t.assignee_id)!.tasks.push({ title: t.title, due_date: (t as { due_date?: string | null }).due_date ?? null })
      }

      const messages: string[] = []
      for (const { name, tasks: assigned } of byAssignee.values()) {
        if (assigned.length === 1) {
          const t = assigned[0]
          const due = t.due_date ? ` (due ${t.due_date})` : ''
          messages.push(`@[${name}] you've been assigned: ${t.title}${due}`)
        } else {
          const list = assigned.map(t => {
            const due = t.due_date ? ` (due ${t.due_date})` : ''
            return `  • ${t.title}${due}`
          }).join('\n')
          messages.push(`@[${name}] you've been assigned ${assigned.length} tasks:\n${list}`)
        }
      }

      if (messages.length > 0) {
        const { error: notifErr } = await supabase.from('chat_messages').insert({
          project_id: projectId,
          sender_type: 'agent',
          body: `📌 Tasks auto-assigned based on collaborator roles.\n\n${messages.join('\n\n')}`,
        })
        if (notifErr) console.warn('Notification failed:', notifErr)
      }
    }

    await supabase.from('audit_logs').insert({
      project_id: projectId,
      actor_id: userId,
      actor_type: 'agent',
      entity_type: 'tasks',
      action: 'auto_assigned',
      diff: { updated: updatedCount },
    })

    return json({ success: true, updated: updatedCount })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-auto-assign unhandled:', msg)
    return json({ error: msg }, 500)
  }
})
