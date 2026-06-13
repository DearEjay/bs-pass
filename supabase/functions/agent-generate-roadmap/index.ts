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

    // Calculate minimum tasks needed: every track needs a task per remaining pipeline stage.
    // Add headroom for project-level tasks (distribution, promo, etc.)
    const incompleteTracks = ctx.tracks.filter(t => t.needsWork.length > 0)
    const minTrackTasks = incompleteTracks.reduce((sum, t) => sum + t.needsWork.length, 0)
    const maxTasks = Math.max(minTrackTasks + 8, ctx.agentPrefs.verbosity === 'concise' ? 15 : 25)

    // Build explicit per-track task requirements the LLM MUST satisfy
    const perTrackRequirements = incompleteTracks.length > 0
      ? `=== MANDATORY PER-TRACK TASKS (you MUST create these — do not skip any) ===
${incompleteTracks.map(t =>
  `Track "${t.title}" [current: ${t.status}] → MUST have tasks for: ${t.needsWork.join(', ')}`
).join('\n')}

Each stage above needs its own dedicated task. Do not combine multiple tracks into one task.`
      : ''

    const trackCountRule = ctx.project.target_track_count !== null && ctx.tracks.length < ctx.project.target_track_count
      ? `- TRACK COUNT GAP: project targets ${ctx.project.target_track_count} tracks but only ${ctx.tracks.length} exist. Include tasks to source, write, or produce the missing ${ctx.project.target_track_count - ctx.tracks.length} track(s) — e.g. "Find producer for track ${ctx.tracks.length + 1}", "Write and demo song ${ctx.tracks.length + 1}", "Book studio session for remaining tracks".`
      : ''

    const releaseDateRule = ctx.project.release_date && ctx.project.days_until_release !== null
      ? ctx.project.days_until_release > 0
        ? `- HARD DEADLINE: release date is ${ctx.project.release_date} (${ctx.project.days_until_release} days away). ALL task due_dates MUST fall before this date. Work backwards from the release date — final tasks (distribution, mastering sign-off) should land 5–7 days before release. Compress durations if needed to fit.`
        : `- RELEASE DATE ${ctx.project.release_date} HAS PASSED. Focus tasks on any remaining post-release work (royalty registration, promo follow-up, etc.).`
      : ''

    const prompt = `You are an AI music project manager generating a COMPLETE roadmap for this project.
Your job is to create every task needed to get this project to completion — do not be conservative.

=== FULL PROJECT CONTEXT ===
${contextBlock}

${perTrackRequirements}

=== TASK GENERATION RULES ===
- Return ONLY a valid JSON array — no markdown, no code fences, no explanation
- Up to ${maxTasks} tasks — use as many as needed to fully cover the project
- COMPLETENESS IS MANDATORY: every incomplete track must have tasks covering every remaining pipeline stage
- Do NOT duplicate any of these existing tasks: ${JSON.stringify(existingTitles)}
- Skip any task types matching AVOID TASK TYPES above
- EVERY task MUST have start_date AND due_date as ISO dates (YYYY-MM-DD)
- Schedule tasks realistically — stages for the same track should be sequential (recording before mixing before mastering)
- Tracks can be worked on in parallel — don't force all tracks to be fully sequential with each other
- Start scheduling from today (or after the latest existing task's due_date if tasks exist)
- Typical durations: writing = 7–14 days, recording = 7–14 days, mixing = 5–7 days, mastering = 3–5 days, admin = 2–3 days
- Add ${ctx.agentPrefs.bufferDays} buffer day(s) between stages within a track
- Priority: "high" for any task blocking release, "medium" for important but not blocking, "low" for nice-to-have
- Assign tasks to collaborators based on their roles using assignee_role
- assignee_role must exactly match a role in the COLLABORATORS list above, or null
${trackCountRule}
${releaseDateRule}
${pluginInstructions ? `\nPLUGIN SCOPE (enabled — include tasks for these areas):\n- ${pluginInstructions}` : ''}

=== TEMPLATE (reference only — real project state above takes priority) ===
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
      const { error: notifErr } = await supabase.from('chat_messages').insert({
        project_id: projectId,
        sender_type: 'agent',
        body: messages.join('\n\n'),
      })
      if (notifErr) console.warn('Assignment notification failed:', notifErr)
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
