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

    const debounceKey = `${projectId}:${event}`
    const lastFired = recentProjectEvents.get(debounceKey) ?? 0
    const now = Date.now()
    if (now - lastFired < 30_000) {
      return json({ skipped: true, reason: 'debounce' })
    }
    recentProjectEvents.set(debounceKey, now)

    const { data: project } = await supabase
      .from('projects')
      .select('id,title,project_type,agent_mode,auto_tasks_enabled')
      .eq('id', projectId)
      .single()

    if (!project) return json({ error: 'Project not found' }, 404)
    if (!project.auto_tasks_enabled) return json({ skipped: true, reason: 'auto_tasks_disabled' })
    if (project.agent_mode === 'off') return json({ skipped: true, reason: 'agent_off' })

    // ── Handle collaborator.removed deterministically (no LLM needed) ──────
    if (event === 'collaborator.removed') {
      const collaboratorId = entityId

      // Unassign all tasks currently assigned to the removed collaborator
      const { data: affected } = await supabase
        .from('tasks')
        .update({ assignee_id: null })
        .eq('project_id', projectId)
        .eq('assignee_id', collaboratorId)
        .is('deleted_at', null)
        .neq('status', 'complete')
        .select('id,title')

      const unassignedCount = affected?.length ?? 0
      const collaboratorName = (metadata?.display_name as string) ?? 'A collaborator'

      if (unassignedCount > 0) {
        await supabase.from('chat_messages').insert({
          project_id: projectId,
          sender_type: 'agent',
          body: `${collaboratorName} was removed from the project. ${unassignedCount} task${unassignedCount !== 1 ? 's have' : ' has'} been unassigned and moved back to the backlog.`,
        })
      } else {
        await supabase.from('chat_messages').insert({
          project_id: projectId,
          sender_type: 'agent',
          body: `${collaboratorName} was removed from the project.`,
        })
      }

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        actor_type: 'agent',
        entity_type: 'collaborators',
        entity_id: collaboratorId,
        action: 'collaborator_removed_tasks_unassigned',
        diff: { tasks_unassigned: unassignedCount },
      })

      return json({ success: true, tasks_unassigned: unassignedCount })
    }

    // ── Handle collaborator.added — role-based task reassignment ────────────
    if (event === 'collaborator.added') {
      const collaboratorId = entityId

      const { data: newCollab } = await supabase
        .from('collaborators')
        .select('id,roles,user_id,profiles:user_id(display_name)')
        .eq('id', collaboratorId)
        .maybeSingle()

      if (!newCollab) return json({ error: 'Collaborator not found' }, 404)

      const collabName = (newCollab.profiles as { display_name: string } | null)?.display_name ?? 'New collaborator'
      const roles: string[] = Array.isArray(newCollab.roles) ? newCollab.roles : []

      // Role → keyword mapping for fuzzy task matching
      const ROLE_KEYWORDS: Record<string, string[]> = {
        mixing_engineer:      ['mix', 'mixing'],
        mastering_engineer:   ['master', 'mastering'],
        recording_engineer:   ['record', 'recording', 'engineer'],
        producer:             ['produce', 'production', 'producer'],
        co_producer:          ['produce', 'production', 'producer'],
        songwriter:           ['song', 'write', 'writing', 'lyrics', 'lyric'],
        graphic_designer:     ['design', 'artwork', 'cover', 'art'],
        video_director:       ['video', 'visual', 'shoot', 'film'],
        marketing:            ['market', 'promo', 'promotion', 'campaign'],
        manager:              ['manage', 'coordinate'],
        featured_artist:      ['feature', 'vocal', 'verse', 'hook'],
        background_vocalist:  ['background', 'backing', 'vocal', 'choir'],
        session_musician:     ['session', 'instrument', 'play', 'record'],
        ar:                   ['pitch', 'label', 'distribution', 'a&r'],
      }

      const keywords = roles.flatMap(r => ROLE_KEYWORDS[r] ?? [])

      let reassignedCount = 0
      if (keywords.length > 0) {
        // Find unassigned tasks that match the collaborator's role keywords
        const { data: unassigned } = await supabase
          .from('tasks')
          .select('id,title')
          .eq('project_id', projectId)
          .is('assignee_id', null)
          .is('deleted_at', null)
          .neq('status', 'complete')

        if (unassigned && unassigned.length > 0) {
          const matched = unassigned.filter(t =>
            keywords.some(kw => t.title.toLowerCase().includes(kw))
          ).slice(0, 5)

          if (matched.length > 0) {
            await supabase
              .from('tasks')
              .update({ assignee_id: newCollab.user_id })
              .in('id', matched.map(t => t.id))

            reassignedCount = matched.length
          }
        }
      }

      // Load current tasks for AI context
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id,title,status,assignee_id,priority')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      const taskSummary = (tasks ?? []).map(t => `- [${t.status}] ${t.title}`).join('\n')

      // Ask AI if any follow-up tasks should be created
      const maxNew = project.agent_mode === 'minimal' ? 1 : 3
      const prompt = `You are an AI music project manager. A new collaborator just joined.

PROJECT: "${project.title}" (${project.project_type})
NEW COLLABORATOR: ${collabName}
ROLES: ${roles.join(', ') || 'unspecified'}
TASKS ALREADY REASSIGNED TO THEM: ${reassignedCount}

CURRENT TASKS:
${taskSummary || '(none yet)'}

Based on their roles, decide if any NEW tasks should be created (max ${maxNew}).
Only create tasks that are clearly needed for their role and don't already exist.

Return ONLY valid JSON (no markdown):
{
  "new_tasks": [
    { "title": string, "description": string|null, "priority": "high"|"medium"|"low" }
  ],
  "chat_message": string
}

Rules:
- chat_message is required (1-2 sentences welcoming them and noting what was assigned)
- Only create tasks if genuinely needed — empty array is fine`

      let aiResult: { new_tasks: Array<{ title: string; description: string | null; priority: string }>; chat_message: string } = {
        new_tasks: [],
        chat_message: reassignedCount > 0
          ? `Welcome ${collabName}! I've assigned ${reassignedCount} task${reassignedCount !== 1 ? 's' : ''} that match${reassignedCount !== 1 ? '' : 'es'} their role.`
          : `Welcome ${collabName} to the project!`,
      }

      try {
        const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
        const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed.new_tasks)) aiResult.new_tasks = parsed.new_tasks
        if (typeof parsed.chat_message === 'string') aiResult.chat_message = parsed.chat_message
      } catch (e) {
        console.warn('Gemini parse failed for collaborator.added:', e)
      }

      aiResult.new_tasks = aiResult.new_tasks.slice(0, maxNew)

      let createdCount = 0
      if (aiResult.new_tasks.length > 0) {
        const currentLen = tasks?.length ?? 0
        const { data: inserted } = await supabase.from('tasks').insert(
          aiResult.new_tasks.map((t, i) => ({
            project_id: projectId,
            title: String(t.title).slice(0, 200),
            description: t.description ?? null,
            priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
            assignee_id: newCollab.user_id,
            created_by: 'agent',
            sort_order: currentLen + i,
          }))
        ).select('id')
        createdCount = inserted?.length ?? 0
      }

      await supabase.from('chat_messages').insert({
        project_id: projectId,
        sender_type: 'agent',
        body: aiResult.chat_message,
      })

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        actor_type: 'agent',
        entity_type: 'collaborators',
        entity_id: collaboratorId,
        action: 'collaborator_added_tasks_assigned',
        diff: { tasks_reassigned: reassignedCount, tasks_created: createdCount },
      })

      return json({ success: true, tasks_reassigned: reassignedCount, tasks_created: createdCount })
    }

    // ── All other events: use AI for follow-up actions ──────────────────────
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id,title,status,assignee_id,priority')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    const taskSummary = (tasks ?? []).map(t => `- [${t.status}] ${t.title}`).join('\n')

    let eventContext = ''
    let entityDetails: Record<string, unknown> = {}

    switch (event) {
      case 'track.status_changed': {
        const { data: track } = await supabase
          .from('tracks')
          .select('id,title,current_status')
          .eq('id', entityId)
          .maybeSingle()
        if (track) {
          entityDetails = { track_title: track.title, new_status: track.current_status, previous_status: metadata?.previous_status }
          eventContext = `Track "${track.title}" status changed from "${metadata?.previous_status}" to "${track.current_status}".`
        }
        break
      }
      case 'task.completed': {
        const { data: task } = await supabase
          .from('tasks')
          .select('id,title,description')
          .eq('id', entityId)
          .maybeSingle()
        if (task) {
          entityDetails = { task_title: task.title }
          eventContext = `Task "${task.title}" was just completed.`
        }
        break
      }
    }

    const maxNew = project.agent_mode === 'minimal' ? 2 : 5
    const prompt = `You are an AI music project manager. A domain event just occurred.

PROJECT: "${project.title}" (${project.project_type})
EVENT: ${event}
EVENT DETAILS: ${JSON.stringify(entityDetails, null, 2)}
${eventContext}

CURRENT TASKS:
${taskSummary || '(none yet)'}

Based on this event, decide what follow-up actions to take. You may:
1. Create new tasks (max ${maxNew}) if genuinely needed
2. Post a helpful message to the project chat

Return ONLY valid JSON (no markdown):
{
  "new_tasks": [
    { "title": string, "description": string|null, "priority": "high"|"medium"|"low" }
  ],
  "chat_message": string|null
}

Rules:
- Only create tasks that are clearly implied by this event and don't already exist
- Don't duplicate existing tasks
- chat_message should be 1-2 sentences max; null if nothing meaningful to say
- If no actions are needed, return { "new_tasks": [], "chat_message": null }`

    let aiResult: { new_tasks: Array<{ title: string; description: string | null; priority: string }>; chat_message: string | null } = {
      new_tasks: [],
      chat_message: null,
    }

    try {
      const raw = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      aiResult = JSON.parse(cleaned)
      if (!Array.isArray(aiResult.new_tasks)) aiResult.new_tasks = []
    } catch (e) {
      console.warn('Gemini parse failed for agent-process-event:', e)
    }

    aiResult.new_tasks = aiResult.new_tasks.slice(0, maxNew)

    let createdCount = 0
    if (aiResult.new_tasks.length > 0) {
      const { data: inserted } = await supabase.from('tasks').insert(
        aiResult.new_tasks.map((t, i) => ({
          project_id: projectId,
          title: String(t.title).slice(0, 200),
          description: t.description ?? null,
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          created_by: 'agent',
          sort_order: (tasks?.length ?? 0) + i,
        }))
      ).select('id')
      createdCount = inserted?.length ?? 0
    }

    if (aiResult.chat_message) {
      await supabase.from('chat_messages').insert({
        project_id: projectId,
        sender_type: 'agent',
        body: aiResult.chat_message,
      })
    }

    await supabase.from('audit_logs').insert({
      project_id: projectId,
      actor_type: 'agent',
      entity_type: 'tasks',
      action: 'event_processed',
      diff: { event, entity_id: entityId, tasks_created: createdCount },
    })

    return json({ success: true, tasks_created: createdCount, chat_posted: !!aiResult.chat_message })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('agent-process-event unhandled:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
