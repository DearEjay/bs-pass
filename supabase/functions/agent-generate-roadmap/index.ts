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
    if (!project.auto_tasks_enabled) return json({ skipped: true })

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

    // ── 4. Context: existing tasks, collaborator roles, agent prefs ───────
    const [existingRes, collabsRes, prefsRes] = await Promise.all([
      supabase.from('tasks').select('title').eq('project_id', projectId).is('deleted_at', null),
      supabase.from('collaborators').select('id,roles,profiles:user_id(display_name)').eq('project_id', projectId).is('removed_at', null),
      supabase.from('user_agent_preferences').select('avoided_task_types,preferred_timeline_buffer_days').eq('user_id', userId).maybeSingle(),
    ])

    const existingTitles = (existingRes.data ?? []).map((t: { title: string }) => t.title)
    const collaborators = (collabsRes.data ?? []) as Array<{ id: string; roles: string[]; profiles: { display_name: string } | null }>
    const agentPrefs = prefsRes.data

    // ── 5. Build role → collaborator_id map ───────────────────────────────
    const roleToCollabId: Record<string, string> = {}
    for (const c of collaborators) {
      for (const role of c.roles ?? []) {
        if (!roleToCollabId[role]) roleToCollabId[role] = c.id
      }
    }

    // ── 6. Call Gemini ────────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const context = {
      project_type: project.project_type,
      title: project.title,
      genre: project.genre ?? 'unspecified',
      budget_level: project.budget_level ?? 'indie',
      agent_mode: project.agent_mode,
      timeline_start: project.timeline_start ?? today,
      timeline_end: project.timeline_end ?? null,
      existing_task_titles: existingTitles,
      collaborator_roles: collaborators.flatMap(c => c.roles ?? []),
      avoided_task_types: agentPrefs?.avoided_task_types ?? [],
      timeline_buffer_days: agentPrefs?.preferred_timeline_buffer_days ?? 0,
    }

    const prompt = `You are an AI music project manager. Customise the roadmap template below for this specific project.

RULES:
- Return ONLY a valid JSON array — no markdown, no code fences, no explanation
- Maximum 12 tasks (fewer if agent_mode is "minimal": max 6)
- Skip tasks whose title matches any in existing_task_titles
- Skip tasks matching any avoided_task_types
- due_date must be an ISO date (YYYY-MM-DD) relative to timeline_start; add timeline_buffer_days to each offset
- priority must be "high", "medium", or "low"
- assignee_role is optional — only include if that role exists in collaborator_roles
- Keep titles under 60 characters

PROJECT CONTEXT:
${JSON.stringify(context, null, 2)}

TEMPLATE TASKS:
${JSON.stringify(template.tasks, null, 2)}

Return a JSON array where each element has:
{ "title": string, "description": string|null, "priority": "high"|"medium"|"low", "due_date": "YYYY-MM-DD"|null, "assignee_role": string|null, "sort_order": number }`

    let taskDrafts: Array<{
      title: string
      description: string | null
      priority: string
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
      taskDrafts = (template.tasks as typeof taskDrafts).map((t, i) => ({
        title: (t as { title: string }).title,
        description: null,
        priority: (t as { priority?: string }).priority ?? 'medium',
        due_date: null,
        assignee_role: null,
        sort_order: i,
      }))
    }

    taskDrafts = taskDrafts.slice(0, 12)

    // ── 7. Insert tasks ───────────────────────────────────────────────────
    const rows = taskDrafts.map((t, i) => ({
      project_id: projectId,
      title: String(t.title ?? `Task ${i + 1}`).slice(0, 200),
      description: t.description ?? null,
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      due_date: t.due_date ?? null,
      assignee_id: t.assignee_role ? (roleToCollabId[t.assignee_role] ?? null) : null,
      created_by: 'agent',
      sort_order: typeof t.sort_order === 'number' ? t.sort_order : i,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from('tasks')
      .insert(rows)
      .select('id,title')

    if (insertErr) {
      console.error('Task insert error:', insertErr)
      return json({ error: 'Failed to insert tasks' }, 500)
    }

    const taskCount = inserted?.length ?? rows.length

    // ── 8. Post to chat ───────────────────────────────────────────────────
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      sender_type: 'agent',
      body: `📋 Roadmap ready — I've generated **${taskCount} tasks** for **${project.title}**. Check the Roadmap tab to review, reorder, or adjust.`,
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
    console.error('agent-generate-roadmap unhandled:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
