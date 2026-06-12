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

const PLUGIN_TASK_SCOPE: Record<string, string> = {
  marketing:      'Include marketing tasks: release strategy, press outreach, promotional campaigns, playlist pitching.',
  social_media:   'Include social media tasks: content calendar, post scheduling, platform-specific rollout (Instagram, TikTok, YouTube).',
  opportunities:  'Include opportunity tasks: sync licensing pitches, brand partnerships, playlist submission.',
  creative:       'Include creative tasks: artwork direction, music video production, visual asset creation.',
  booking:        'Include booking tasks: live show planning, tour logistics, venue outreach.',
  fan_engagement: 'Include fan engagement tasks: newsletter drafts, community updates, fan-facing content.',
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
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('removed_at', null)
      .maybeSingle()
    if (!collab) return json({ error: 'Forbidden' }, 403)

    // Build full project context
    const ctx = await buildAgentContext(projectId, userId)
    const contextBlock = formatContextForPrompt(ctx)

    // Load roadmap template for the project type
    const { data: template } = await supabase
      .from('roadmap_templates')
      .select('tasks')
      .eq('project_type', ctx.project.type)
      .maybeSingle()

    if (!template) return json({ error: 'No template for project type' }, 422)

    // Build role → userId map for assignment
    const roleToUserId: Record<string, string> = {}
    for (const c of ctx.collaborators) {
      for (const role of c.roles) {
        if (!roleToUserId[role]) roleToUserId[role] = c.userId
      }
    }

    // Plugin scope additions
    const pluginInstructions = ctx.agentPrefs.plugins
      .map(p => PLUGIN_TASK_SCOPE[p])
      .filter(Boolean)
      .join('\n- ')

    const existingTitles = ctx.tasks.map(t => t.title)
    const maxTasks = ctx.agentPrefs.verbosity === 'concise' ? 8 : 12

    const prompt = `You are an AI music project manager. Generate a roadmap for this project.

=== FULL PROJECT CONTEXT ===
${contextBlock}

=== TASK GENERATION RULES ===
- Return ONLY a valid JSON array — no markdown, no code fences, no explanation
- Maximum ${maxTasks} tasks
- Do NOT duplicate any of these existing tasks: ${JSON.stringify(existingTitles)}
- Skip any task types matching AVOID TASK TYPES above
- EVERY task MUST have start_date AND due_date as ISO dates (YYYY-MM-DD)
- Schedule tasks SEQUENTIALLY — each start_date must be after the previous due_date
- Start from timeline_start (or after the latest incomplete task's due_date)
- Typical durations: writing/recording = 14 days, mixing/mastering = 7 days, admin = 3 days
- Add ${ctx.agentPrefs.bufferDays} buffer day(s) between tasks
- Priority must be "high", "medium", or "low"
- Assign tasks to collaborators based on their roles using assignee_role
- assignee_role must exactly match a role in the COLLABORATORS list above
- Address COMPLETION GAPS above — prioritise tasks that move tracks toward "released"
- Tasks should NOT recreate work already done (check TRACKS status)
${pluginInstructions ? `\nPLUGIN SCOPE (enabled — include tasks for these areas):\n- ${pluginInstructions}` : ''}

=== TEMPLATE (use as inspiration, adapt to project state) ===
${JSON.stringify(template.tasks, null, 2)}

Return JSON array where each element is:
{ "title": string, "description": string|null, "priority": "high"|"medium"|"low", "start_date": "YYYY-MM-DD", "due_date": "YYYY-MM-DD", "assignee_role": string|null, "sort_order": number }`

    let taskDrafts: Array<{
      title: string
      description: string | null
      priority: string
      start_date: string | null
      due_date: string | null
      assignee_role: string | null
      sort_order: number
    }>

    try {
      const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed)) throw new Error('not array')
      taskDrafts = parsed
    } catch (e) {
      console.warn('LLM parse failed, using template fallback:', e)
      const bufferDays = ctx.agentPrefs.bufferDays
      const timelineStart = ctx.project.timeline_start ?? ctx.project.today
      taskDrafts = (template.tasks as typeof taskDrafts).map((t, i) => {
        const start = new Date(timelineStart)
        start.setDate(start.getDate() + i * (7 + bufferDays))
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        const toIso = (d: Date) => d.toISOString().split('T')[0]
        return {
          title: (t as { title: string }).title,
          description: null,
          priority: (t as { priority?: string }).priority ?? 'medium',
          start_date: toIso(start),
          due_date: toIso(end),
          assignee_role: null,
          sort_order: i,
        }
      })
    }

    taskDrafts = taskDrafts.slice(0, maxTasks)

    const rows = taskDrafts.map((t, i) => ({
      project_id: projectId,
      title: String(t.title ?? `Task ${i + 1}`).slice(0, 200),
      description: t.description ?? null,
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      start_date: t.start_date ?? null,
      due_date: t.due_date ?? null,
      assignee_id: t.assignee_role ? (roleToUserId[t.assignee_role] ?? null) : null,
      created_by: 'agent',
      sort_order: typeof t.sort_order === 'number' ? t.sort_order : i,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from('tasks')
      .insert(rows)
      .select('id,title')

    if (insertErr) {
      console.error('Task insert error:', insertErr)
      return json({ error: `Insert failed: ${insertErr.message}` }, 500)
    }

    const taskCount = inserted?.length ?? rows.length

    // Post @here notification to chat
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      sender_type: 'agent',
      body: `@here 📋 Roadmap ready — I've generated ${taskCount} tasks for "${ctx.project.title}". Check the Roadmap tab to review, reorder, or adjust.`,
    })

    // Notify assigned collaborators
    const assignedByUser = new Map<string, { name: string; tasks: Array<{ title: string; due_date: string | null }> }>()
    for (let i = 0; i < (inserted ?? []).length; i++) {
      const row = rows[i]
      const task = inserted![i]
      if (!row.assignee_id || !task) continue
      const collaborator = ctx.collaborators.find(c => c.userId === row.assignee_id)
      const name = collaborator?.name ?? 'there'
      if (!assignedByUser.has(row.assignee_id)) assignedByUser.set(row.assignee_id, { name, tasks: [] })
      assignedByUser.get(row.assignee_id)!.tasks.push({ title: task.title, due_date: row.due_date })
    }

    if (assignedByUser.size > 0) {
      const messages: string[] = []
      for (const { name, tasks: assigned } of assignedByUser.values()) {
        if (assigned.length === 1) {
          const due = assigned[0].due_date ? ` (due ${assigned[0].due_date})` : ''
          messages.push(`@${name} you've been assigned: ${assigned[0].title}${due}`)
        } else {
          const list = assigned.map(t => `  • ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')
          messages.push(`@${name} you've been assigned ${assigned.length} tasks:\n${list}`)
        }
      }
      await supabase.from('chat_messages').insert({
        project_id: projectId,
        sender_type: 'agent',
        body: messages.join('\n\n'),
      }).catch(e => console.warn('Assignment notification failed:', e))
    }

    await supabase.from('audit_logs').insert({
      project_id: projectId,
      actor_type: 'agent',
      entity_type: 'tasks',
      action: 'roadmap_generated',
      diff: { task_count: taskCount, project_type: ctx.project.type },
    })

    return json({ success: true, task_count: taskCount })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-generate-roadmap unhandled:', msg)
    return json({ error: msg }, 500)
  }
})
