/**
 * Builds a rich, standardised project context object used by every agent function.
 * Single source of truth — always pass the full context to the LLM.
 */
import { db } from './db.ts'

export interface AgentContext {
  project: {
    id: string
    title: string
    type: string
    genre: string
    budget: string
    timeline_start: string | null
    timeline_end: string | null
    today: string
  }
  agentPrefs: {
    tone: string
    verbosity: string
    bufferDays: number
    autoTaskTriggers: boolean
    avoidedTaskTypes: string[]
    plugins: string[]
  }
  collaborators: Array<{
    userId: string
    name: string
    roles: string[]
    isMainArtist: boolean
  }>
  tracks: Array<{
    id: string
    title: string
    status: string
    needsWork: string[] // stages still required to reach "released"
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    startDate: string | null
    dueDate: string | null
    assigneeName: string | null
    description: string | null
  }>
  completionGaps: string[] // high-level gaps between current state and project completion
}

const TRACK_PIPELINE = [
  'not_started',
  'recording',
  'recorded',
  'mixing',
  'mixed',
  'mastering',
  'mastered',
  'released',
]

function stagesNeeded(currentStatus: string): string[] {
  const idx = TRACK_PIPELINE.indexOf(currentStatus)
  if (idx === -1 || currentStatus === 'released') return []
  return TRACK_PIPELINE.slice(idx + 1)
}

export async function buildAgentContext(
  projectId: string,
  requestingUserId: string,
): Promise<AgentContext> {
  const supabase = db()
  const today = new Date().toISOString().split('T')[0]

  const [projectRes, collabsRes, tracksRes, tasksRes, prefsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id,title,project_type,genre,budget_level,timeline_start,timeline_end,agent_mode')
      .eq('id', projectId)
      .single(),

    supabase
      .from('collaborators')
      .select('user_id,roles,is_main_artist,profiles:user_id(display_name,full_name)')
      .eq('project_id', projectId)
      .is('removed_at', null),

    supabase
      .from('tracks')
      .select('id,title,current_status')
      .eq('project_id', projectId)
      .is('deleted_at', null),

    supabase
      .from('tasks')
      .select('id,title,status,priority,start_date,due_date,description,assignee_id,profiles:assignee_id(display_name,full_name)')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),

    supabase
      .from('user_agent_preferences')
      .select('agent_tone,agent_verbosity,preferred_timeline_buffer_days,auto_task_triggers,avoided_task_types,enabled_plugins')
      .eq('user_id', requestingUserId)
      .maybeSingle(),
  ])

  const project = projectRes.data
  const prefs = prefsRes.data

  const collaborators = (collabsRes.data ?? []).map(c => {
    const p = c.profiles as { display_name: string | null; full_name: string | null } | null
    return {
      userId: c.user_id,
      name: p?.full_name ?? p?.display_name ?? 'Unknown',
      roles: c.is_main_artist ? ['main_artist', ...(c.roles ?? [])] : (c.roles ?? []),
      isMainArtist: c.is_main_artist,
    }
  })

  const tracks = (tracksRes.data ?? []).map(t => ({
    id: t.id,
    title: t.title,
    status: t.current_status ?? 'not_started',
    needsWork: stagesNeeded(t.current_status ?? 'not_started'),
  }))

  const tasks = (tasksRes.data ?? []).map(t => {
    const p = t.profiles as { display_name: string | null; full_name: string | null } | null
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority ?? 'medium',
      startDate: t.start_date ?? null,
      dueDate: t.due_date ?? null,
      assigneeName: p?.full_name ?? p?.display_name ?? null,
      description: t.description ?? null,
    }
  })

  // Derive completion gaps: tracks that need work but lack matching tasks
  const incompleteTasks = tasks.filter(t => t.status !== 'complete').map(t => t.title.toLowerCase())
  const completionGaps: string[] = []

  for (const track of tracks) {
    for (const stage of track.needsWork) {
      const keyword = stage.replace(/_/g, ' ')
      const hasTask = incompleteTasks.some(title =>
        title.includes(keyword) || title.includes(track.title.toLowerCase())
      )
      if (!hasTask) {
        completionGaps.push(`"${track.title}" needs ${keyword} — no task exists yet`)
      }
    }
  }

  // Check for common project-level gaps
  const taskTitles = incompleteTasks.join(' ')
  if (tracks.length > 0 && !taskTitles.includes('master') && tracks.some(t => ['mixed', 'mixing', 'recorded'].includes(t.status))) {
    completionGaps.push('No mastering task found for tracks that are ready')
  }
  if (!taskTitles.includes('distribut') && !taskTitles.includes('release') && tracks.some(t => t.status === 'mastered')) {
    completionGaps.push('No distribution/release task for mastered tracks')
  }

  const enabledPlugins = prefs?.enabled_plugins
    ? Object.entries(prefs.enabled_plugins as Record<string, boolean>)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : []

  return {
    project: {
      id: projectId,
      title: project?.title ?? 'Unknown',
      type: project?.project_type ?? 'album',
      genre: project?.genre ?? 'unspecified',
      budget: project?.budget_level ?? 'indie',
      timeline_start: project?.timeline_start ?? today,
      timeline_end: project?.timeline_end ?? null,
      today,
    },
    agentPrefs: {
      tone: prefs?.agent_tone ?? 'professional',
      verbosity: prefs?.agent_verbosity ?? 'balanced',
      bufferDays: prefs?.preferred_timeline_buffer_days ?? 0,
      autoTaskTriggers: prefs?.auto_task_triggers !== false,
      avoidedTaskTypes: (prefs?.avoided_task_types as string[] | null) ?? [],
      plugins: enabledPlugins,
    },
    collaborators,
    tracks,
    tasks,
    completionGaps,
  }
}

/** Formats the context as a structured prompt section for the LLM */
export function formatContextForPrompt(ctx: AgentContext): string {
  const { project, agentPrefs, collaborators, tracks, tasks, completionGaps } = ctx

  const collabList = collaborators.length > 0
    ? collaborators.map(c => `  - ${c.name} [${c.roles.join(', ')}]`).join('\n')
    : '  (none)'

  const trackList = tracks.length > 0
    ? tracks.map(t => {
        const needs = t.needsWork.length > 0 ? ` → still needs: ${t.needsWork.join(' → ')}` : ' ✓ released'
        return `  - "${t.title}": ${t.status}${needs}`
      }).join('\n')
    : '  (no tracks yet)'

  const incomplete = tasks.filter(t => t.status !== 'complete')
  const complete = tasks.filter(t => t.status === 'complete')
  const taskList = incomplete.length > 0
    ? incomplete.map(t => {
        const assignee = t.assigneeName ? ` → assigned: ${t.assigneeName}` : ''
        const dates = (t.startDate || t.dueDate) ? ` [${t.startDate ?? '?'} – ${t.dueDate ?? '?'}]` : ''
        return `  - [${t.status}|${t.priority}] "${t.title}"${dates}${assignee}`
      }).join('\n')
    : '  (none)'

  const gapList = completionGaps.length > 0
    ? completionGaps.map(g => `  - ${g}`).join('\n')
    : '  (none detected)'

  const toneInstr = agentPrefs.tone === 'casual'
    ? 'Write in a casual, conversational tone.'
    : agentPrefs.tone === 'direct'
    ? 'Write in a direct, action-focused tone.'
    : 'Write in a professional tone.'

  const verbosityInstr = agentPrefs.verbosity === 'concise'
    ? 'Keep task descriptions to 1 short sentence (under 15 words).'
    : agentPrefs.verbosity === 'detailed'
    ? 'Write detailed descriptions with full context (2–3 sentences).'
    : 'Write moderate descriptions (1–2 sentences).'

  return `PROJECT: "${project.title}" — ${project.type} | genre: ${project.genre} | budget: ${project.budget}
TIMELINE: ${project.timeline_start ?? 'not set'} → ${project.timeline_end ?? 'open-ended'} | today: ${project.today}
AGENT PREFS: tone=${agentPrefs.tone} | verbosity=${agentPrefs.verbosity} | buffer=${agentPrefs.bufferDays}d | plugins=[${agentPrefs.plugins.join(', ') || 'none'}]
AVOID TASK TYPES: ${agentPrefs.avoidedTaskTypes.join(', ') || 'none'}

COLLABORATORS (${collaborators.length}):
${collabList}

TRACKS & PIPELINE STATUS (${tracks.length}):
${trackList}

INCOMPLETE TASKS (${incomplete.length} of ${tasks.length} total, ${complete.length} complete):
${taskList}

COMPLETION GAPS — tasks likely needed but missing:
${gapList}

TONE: ${toneInstr}
VERBOSITY: ${verbosityInstr}`
}
