import { requireAuth } from '../_shared/auth.ts'
import { db } from '../_shared/db.ts'
import { generateContent } from '../_shared/gemini.ts'

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
    const { projectId } = await req.json()
    if (!projectId) return json({ error: 'projectId required' }, 400)

    const supabase = db()

    // ── 1. Load project ───────────────────────────────────────────────────
    const { data: project } = await supabase
      .from('projects')
      .select('id,title,project_type,agent_mode,timeline_start,timeline_end,budget_level,genre,auto_tasks_enabled')
      .eq('id', projectId)
      .single()

    if (!project) return json({ error: 'Project not found' }, 404)

    // ── 2. Verify caller is a collaborator ────────────────────────────────
    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('removed_at', null)
      .maybeSingle()

    if (!collab) return json({ error: 'Forbidden' }, 403)

    // ── 3. Load template ──────────────────────────────────────────────────
    const { data: template } = await supabase
      .from('roadmap_templates')
      .select('tasks')
      .eq('project_type', project.project_type)
      .maybeSingle()

    if (!template) return json({ error: 'No template for project type' }, 422)

    // ── 4. Context: existing tasks, tracks, collaborator roles, agent prefs ─
    const [existingRes, tracksRes, collabsRes, prefsRes] = await Promise.all([
      supabase.from('tasks').select('title,status,priority,start_date,due_date,description').eq('project_id', projectId).is('deleted_at', null),
      supabase.from('tracks').select('title,current_status').eq('project_id', projectId).is('deleted_at', null),
      supabase.from('collaborators').select('id,user_id,roles,profiles:user_id(display_name)').eq('project_id', projectId).is('removed_at', null),
      supabase.from('user_agent_preferences').select('avoided_task_types,preferred_timeline_buffer_days,agent_tone,agent_verbosity,auto_task_triggers').eq('user_id', userId).maybeSingle(),
    ])

    const existingTasks = (existingRes.data ?? []) as Array<{ title: string; status: string; priority: string | null; start_date: string | null; due_date: string | null; description: string | null }>
    const existingTitles = existingTasks.map(t => t.title)
    const incompleteTasks = existingTasks.filter(t => t.status !== 'complete')
    const trackStatuses = (tracksRes.data ?? []) as Array<{ title: string; current_status: string }>
    const collaborators = (collabsRes.data ?? []) as Array<{ id: string; user_id: string; roles: string[]; profiles: { display_name: string } | null }>
    const agentPrefs = prefsRes.data

    // ── 5. Build role → collaborator_id map ───────────────────────────────
    // Map role → profile user_id (assignee_id is a FK to profiles, not collaborators)
    const roleToUserId: Record<string, string> = {}
    for (const c of collaborators) {
      for (const role of c.roles ?? []) {
        if (!roleToUserId[role]) roleToUserId[role] = c.user_id
      }
    }

    // ── 6. Call Gemini ────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const timelineStart = project.timeline_start ?? today
    const bufferDays = agentPrefs?.preferred_timeline_buffer_days ?? 0

    const context = {
      project_type: project.project_type,
      title: project.title,
      genre: project.genre ?? 'unspecified',
      budget_level: project.budget_level ?? 'indie',
      agent_mode: project.agent_mode,
      timeline_start: timelineStart,
      timeline_end: project.timeline_end ?? null,
      today,
      collaborator_roles: collaborators.flatMap(c => c.roles ?? []),
      avoided_task_types: agentPrefs?.avoided_task_types ?? [],
      timeline_buffer_days: bufferDays,
      agent_tone: agentPrefs?.agent_tone ?? 'professional',
      agent_verbosity: agentPrefs?.agent_verbosity ?? 'balanced',
    }

    const incompleteTasksSummary = incompleteTasks.length > 0
      ? incompleteTasks.map(t =>
          `- [${t.status}] "${t.title}"${t.start_date ? ` starts ${t.start_date}` : ''}${t.due_date ? ` due ${t.due_date}` : ''}${t.description ? ` — ${t.description}` : ''}`
        ).join('\n')
      : '(none)'

    const trackStatusSummary = trackStatuses.length > 0
      ? trackStatuses.map(t => `- "${t.title}": ${t.current_status}`).join('\n')
      : '(no tracks yet)'

    const toneInstruction = context.agent_tone === 'casual'
      ? 'Write descriptions in a casual, conversational tone.'
      : context.agent_tone === 'direct'
      ? 'Write descriptions in a direct, action-focused tone with minimal fluff.'
      : 'Write descriptions in a professional, business-appropriate tone.'

    const verbosityInstruction = context.agent_verbosity === 'concise'
      ? 'Keep task descriptions to 1 short sentence (under 15 words).'
      : context.agent_verbosity === 'detailed'
      ? 'Write detailed task descriptions with full context (2–3 sentences).'
      : 'Write moderate task descriptions (1–2 sentences).'

    const prompt = `You are an AI music project manager. Generate a roadmap for this project.

RULES:
- Return ONLY a valid JSON array — no markdown, no code fences, no explanation
- Maximum 12 tasks (max 6 if agent_mode is "minimal")
- Do NOT duplicate any task in existing_incomplete_tasks
- Skip any task types matching avoided_task_types
- EVERY task MUST have both start_date AND due_date as ISO dates (YYYY-MM-DD)
- Tasks must be scheduled SEQUENTIALLY — each task's start_date must be AFTER the previous task's due_date
- Start the first new task from timeline_start (or after the latest existing task's due_date if there are incomplete tasks)
- Typical task durations: writing/recording = 14 days, mixing/mastering = 7 days, admin/planning = 3 days
- Add timeline_buffer_days padding between tasks
- priority must be "high", "medium", or "low"
- Tasks should reflect the current state of tracks (don't generate tasks for already-complete track stages)
- assignee_role is optional — only include if that role exists in collaborator_roles
- Keep titles under 60 characters
- ${toneInstruction}
- ${verbosityInstruction}

PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

EXISTING INCOMPLETE TASKS (do not duplicate these):
${incompleteTasksSummary}

TRACK STATUSES (use to determine what stages are already done):
${trackStatusSummary}

TEMPLATE (use as inspiration, adapt to fit the project state):
${JSON.stringify(template.tasks, null, 2)}

Return a JSON array where each element has:
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
      console.warn('Gemini parse failed, using raw template:', e)
      // Fallback: space template tasks 7 days apart from timeline_start
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

    taskDrafts = taskDrafts.slice(0, 12)

    // ── 7. Insert tasks ───────────────────────────────────────────────────
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
      return json({ error: `Insert failed: ${insertErr.message} (${insertErr.code})` }, 500)
    }

    const taskCount = inserted?.length ?? rows.length

    // ── 8. Post to chat ───────────────────────────────────────────────────
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      sender_type: 'agent',
      body: `@here 📋 Roadmap ready — I've generated ${taskCount} tasks for "${project.title}". Check the Roadmap tab to review, reorder, or adjust.`,
    })

    // ── 9. Audit log ──────────────────────────────────────────────────────
    await supabase.from('audit_logs').insert({
      project_id: projectId,
      actor_type: 'agent',
      entity_type: 'tasks',
      action: 'roadmap_generated',
      diff: { task_count: taskCount, project_type: project.project_type },
    })

    return json({ success: true, task_count: taskCount })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-generate-roadmap unhandled:', msg)
    return json({ error: msg }, 500)
  }
})
