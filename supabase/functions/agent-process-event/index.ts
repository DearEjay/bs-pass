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

type EventType =
  | 'track.status_changed'
  | 'task.completed'
  | 'collaborator.added'
  | 'collaborator.removed'

interface EventPayload {
  event: EventType
  projectId: string
  entityId: string
  metadata?: Record<string, unknown>
}

const recentProjectEvents = new Map<string, number>()

const ROLE_KEYWORDS: Record<string, string[]> = {
  mixing_engineer:     ['mix', 'mixing'],
  mastering_engineer:  ['master', 'mastering'],
  recording_engineer:  ['record', 'recording', 'engineer'],
  producer:            ['produce', 'production', 'producer'],
  co_producer:         ['produce', 'production', 'producer'],
  songwriter:          ['song', 'write', 'writing', 'lyrics', 'lyric'],
  graphic_designer:    ['design', 'artwork', 'cover', 'art'],
  video_director:      ['video', 'visual', 'shoot', 'film'],
  marketing:           ['market', 'promo', 'promotion', 'campaign'],
  manager:             ['manage', 'coordinate'],
  featured_artist:     ['feature', 'vocal', 'verse', 'hook'],
  background_vocalist: ['background', 'backing', 'vocal', 'choir'],
  session_musician:    ['session', 'instrument', 'play'],
  ar:                  ['pitch', 'label', 'distribution'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { userId } = await requireAuth(req)
    const payload = await req.json() as EventPayload
    const { event, projectId, entityId, metadata } = payload

    if (!event || !projectId || !entityId) {
      return json({ error: 'event, projectId, entityId are required' }, 400)
    }

    const supabase = db()

    const { data: collab } = await supabase
      .from('collaborators')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .is('removed_at', null)
      .maybeSingle()
    if (!collab) return json({ error: 'Forbidden' }, 403)

    // Debounce per project+event
    const debounceKey = `${projectId}:${event}`
    const lastFired = recentProjectEvents.get(debounceKey) ?? 0
    const now = Date.now()
    if (now - lastFired < 30_000) return json({ skipped: true, reason: 'debounce' })
    recentProjectEvents.set(debounceKey, now)

    // Check auto_tasks_enabled before doing any heavy lifting
    const { data: project } = await supabase
      .from('projects')
      .select('auto_tasks_enabled')
      .eq('id', projectId)
      .single()
    if (!project) return json({ error: 'Project not found' }, 404)
    if (!project.auto_tasks_enabled) return json({ skipped: true, reason: 'auto_tasks_disabled' })

    // ── collaborator.removed — deterministic, no LLM needed ─────────────────
    if (event === 'collaborator.removed') {
      const { data: affected } = await supabase
        .from('tasks')
        .update({ assignee_id: null })
        .eq('project_id', projectId)
        .eq('assignee_id', entityId)
        .is('deleted_at', null)
        .neq('status', 'complete')
        .select('id,title')

      const unassignedCount = affected?.length ?? 0
      const name = (metadata?.display_name as string) ?? 'A collaborator'

      await supabase.from('chat_messages').insert({
        project_id: projectId,
        sender_type: 'agent',
        body: unassignedCount > 0
          ? `${name} was removed from the project. ${unassignedCount} task${unassignedCount !== 1 ? 's have' : ' has'} been unassigned.`
          : `${name} was removed from the project.`,
      })

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        actor_type: 'agent',
        entity_type: 'collaborators',
        entity_id: entityId,
        action: 'collaborator_removed_tasks_unassigned',
        diff: { tasks_unassigned: unassignedCount },
      })

      return json({ success: true, tasks_unassigned: unassignedCount })
    }

    // Build full context — used for all remaining event types
    const ctx = await buildAgentContext(projectId, userId)
    const contextBlock = formatContextForPrompt(ctx)
    const maxNew = ctx.agentPrefs.verbosity === 'concise' ? 2 : 5

    // ── collaborator.added ───────────────────────────────────────────────────
    if (event === 'collaborator.added') {
      const { data: newCollab } = await supabase
        .from('collaborators')
        .select('id,roles,user_id,profiles:user_id(display_name,full_name)')
        .eq('id', entityId)
        .maybeSingle()
      if (!newCollab) return json({ error: 'Collaborator not found' }, 404)

      const p = newCollab.profiles as { display_name: string | null; full_name: string | null } | null
      const collabName = p?.full_name ?? p?.display_name ?? 'New collaborator'
      const roles: string[] = Array.isArray(newCollab.roles) ? newCollab.roles : []
      const keywords = roles.flatMap(r => ROLE_KEYWORDS[r] ?? [])

      // Keyword-match unassigned tasks to this collaborator's roles
      let reassignedCount = 0
      if (keywords.length > 0) {
        const unassigned = ctx.tasks.filter(t => !t.assigneeName && t.status !== 'complete')
        const matched = unassigned
          .filter(t => keywords.some(kw => t.title.toLowerCase().includes(kw)))
          .slice(0, 5)
        if (matched.length > 0) {
          await supabase
            .from('tasks')
            .update({ assignee_id: newCollab.user_id })
            .in('id', matched.map(t => t.id))
          reassignedCount = matched.length
        }
      }

      const prompt = `You are an AI music project manager. A new collaborator just joined.

=== FULL PROJECT CONTEXT ===
${contextBlock}

=== EVENT ===
NEW COLLABORATOR: ${collabName}
ROLES: ${roles.join(', ') || 'unspecified'}
TASKS ALREADY REASSIGNED TO THEM: ${reassignedCount}

Based on their roles and the project state above, decide if any NEW tasks should be created (max ${maxNew}).
Only create tasks clearly needed for their role that don't already exist.

Return ONLY valid JSON (no markdown):
{
  "new_tasks": [{ "title": string, "description": string|null, "priority": "high"|"medium"|"low" }],
  "chat_message": string
}

Rules:
- chat_message is required (1–2 sentences: welcome them, note what was assigned)
- Respect AVOID TASK TYPES and agent tone/verbosity settings above
- Empty new_tasks array is fine if nothing is genuinely needed`

      let result = {
        new_tasks: [] as Array<{ title: string; description: string | null; priority: string }>,
        chat_message: reassignedCount > 0
          ? `Welcome ${collabName}! I've assigned ${reassignedCount} task${reassignedCount !== 1 ? 's' : ''} that match their role.`
          : `Welcome ${collabName} to the project!`,
      }

      try {
        const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
        const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
        if (Array.isArray(parsed.new_tasks)) result.new_tasks = parsed.new_tasks.slice(0, maxNew)
        if (typeof parsed.chat_message === 'string') result.chat_message = parsed.chat_message
      } catch (e) {
        console.warn('LLM parse failed for collaborator.added:', e)
      }

      let createdCount = 0
      if (result.new_tasks.length > 0) {
        const { data: inserted } = await supabase.from('tasks').insert(
          result.new_tasks.map((t, i) => ({
            project_id: projectId,
            title: String(t.title).slice(0, 200),
            description: t.description ?? null,
            priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
            assignee_id: newCollab.user_id,
            created_by: 'agent',
            sort_order: ctx.tasks.length + i,
          }))
        ).select('id')
        createdCount = inserted?.length ?? 0
      }

      await supabase.from('chat_messages').insert({ project_id: projectId, sender_type: 'agent', body: result.chat_message })
      await supabase.from('audit_logs').insert({
        project_id: projectId, actor_type: 'agent', entity_type: 'collaborators', entity_id: entityId,
        action: 'collaborator_added_tasks_assigned',
        diff: { tasks_reassigned: reassignedCount, tasks_created: createdCount },
      })
      return json({ success: true, tasks_reassigned: reassignedCount, tasks_created: createdCount })
    }

    // ── track.status_changed / task.completed ────────────────────────────────
    let eventContext = ''
    if (event === 'track.status_changed') {
      const track = ctx.tracks.find(t => t.id === entityId)
      if (track) {
        eventContext = `Track "${track.title}" status changed from "${metadata?.previous_status}" to "${track.status}". Still needs: ${track.needsWork.join(' → ') || 'nothing — it is released'}.`
      }
    } else if (event === 'task.completed') {
      const task = ctx.tasks.find(t => t.id === entityId)
      eventContext = task
        ? `Task "${task.title}" was just completed.`
        : `A task was just completed (id: ${entityId}).`
    }

    const roleToUserId: Record<string, string> = {}
    for (const c of ctx.collaborators) {
      for (const role of c.roles) {
        if (!roleToUserId[role]) roleToUserId[role] = c.userId
      }
    }

    const prompt = `You are an AI music project manager. A domain event just occurred.

=== FULL PROJECT CONTEXT ===
${contextBlock}

=== EVENT ===
TYPE: ${event}
DETAIL: ${eventContext}

Based on this event and the full project context above, decide what follow-up actions to take.
Prioritise addressing COMPLETION GAPS. Assign tasks to collaborators by role where possible.

Return ONLY valid JSON (no markdown):
{
  "new_tasks": [{ "title": string, "description": string|null, "priority": "high"|"medium"|"low", "assignee_role": string|null }],
  "chat_message": string|null
}

Rules:
- Max ${maxNew} new tasks; only create what is genuinely implied by this event
- Do NOT duplicate any existing incomplete task
- Respect AVOID TASK TYPES and tone/verbosity above
- assignee_role must match a role from the COLLABORATORS list
- chat_message: 1–2 sentences max, or null if nothing meaningful to say`

    let result = {
      new_tasks: [] as Array<{ title: string; description: string | null; priority: string; assignee_role: string | null }>,
      chat_message: null as string | null,
    }

    try {
      const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
      const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
      if (Array.isArray(parsed.new_tasks)) result.new_tasks = parsed.new_tasks.slice(0, maxNew)
      if (typeof parsed.chat_message === 'string') result.chat_message = parsed.chat_message
    } catch (e) {
      console.warn('LLM parse failed for agent-process-event:', e)
    }

    let createdCount = 0
    if (result.new_tasks.length > 0) {
      const { data: inserted } = await supabase.from('tasks').insert(
        result.new_tasks.map((t, i) => ({
          project_id: projectId,
          title: String(t.title).slice(0, 200),
          description: t.description ?? null,
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          assignee_id: t.assignee_role ? (roleToUserId[t.assignee_role] ?? null) : null,
          created_by: 'agent',
          sort_order: ctx.tasks.length + i,
        }))
      ).select('id')
      createdCount = inserted?.length ?? 0
    }

    if (result.chat_message) {
      await supabase.from('chat_messages').insert({ project_id: projectId, sender_type: 'agent', body: result.chat_message })
    }

    await supabase.from('audit_logs').insert({
      project_id: projectId, actor_type: 'agent', entity_type: 'tasks', action: 'event_processed',
      diff: { event, entity_id: entityId, tasks_created: createdCount },
    })

    return json({ success: true, tasks_created: createdCount, chat_posted: !!result.chat_message })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('agent-process-event unhandled:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
