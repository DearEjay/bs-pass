import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { requireAuth } from '../_shared/auth.ts'
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
    await requireAuth(req)
    const { projectId, displayName } = await req.json()
    if (!projectId) return json({ error: 'projectId required' }, 400)

    // Use the user's JWT so RLS grants access to their project
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const [
      { data: project, error: projectError },
      { data: tasks },
      { data: tracks },
    ] = await Promise.all([
      supabase.from('projects').select('title,project_type').eq('id', projectId).single(),
      supabase.from('tasks').select('title,status,priority,due_date,start_date').eq('project_id', projectId).is('deleted_at', null),
      supabase.from('tracks').select('title,current_status').eq('project_id', projectId).is('deleted_at', null),
    ])

    if (!project) {
      console.error('project lookup failed:', projectError, 'projectId:', projectId)
      return json({ error: 'not found', detail: projectError?.message }, 404)
    }

    type Task = { title: string; status: string; priority: string | null; due_date: string | null; start_date: string | null }
    const allTasks = (tasks ?? []) as Task[]

    const done  = allTasks.filter(t => t.status === 'complete').length
    const total = allTasks.length
    const today = new Date().toISOString().split('T')[0]

    const overdue = allTasks
      .filter(t => t.due_date && t.status !== 'complete' && t.due_date < today)
      .map(t => t.title)

    const upcoming = allTasks
      .filter(t => t.status !== 'complete')
      .sort((a, b) => {
        // High priority first, then by due_date, then start_date
        const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
        const pa = pOrder[a.priority ?? 'medium'] ?? 1
        const pb = pOrder[b.priority ?? 'medium'] ?? 1
        if (pa !== pb) return pa - pb
        return (a.due_date ?? a.start_date ?? 'z').localeCompare(b.due_date ?? b.start_date ?? 'z')
      })
      .slice(0, 5)

    const trackSummary = (tracks ?? []).length > 0
      ? (tracks as { title: string; current_status: string }[]).map(t => `- ${t.title} (${t.current_status})`).join('\n')
      : '(no tracks yet)'

    const taskSummary = total > 0
      ? allTasks.map(t => `- [${t.status}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')
      : '(no tasks yet)'

    const upcomingSummary = upcoming.length > 0
      ? upcoming.map(t => `- ${t.title} [${t.priority ?? 'medium'} priority]${t.due_date ? ` due ${t.due_date}` : ''}`).join('\n')
      : '(all tasks complete)'

    const name = displayName || 'there'
    const prompt = `You are a music project manager assistant. Write a project status update addressed directly to ${name}.

Structure your response as exactly 2 parts — no headers, no bullet points, just natural flowing sentences:
1. A 1-2 sentence status summary starting with "Hey ${name}," — conversational and encouraging. Only flag urgency if there are overdue tasks.
2. A single sentence recommendation starting with exactly "I would recommend" — pick the most impactful next action based on the upcoming tasks below.

PROJECT: "${project.title}" (${project.project_type})
TASKS: ${done} of ${total} complete
OVERDUE: ${overdue.join(', ') || 'none'}
TRACKS:\n${trackSummary}
ALL TASKS:\n${taskSummary}
UPCOMING (not yet complete, priority-sorted):\n${upcomingSummary}`

    const summary = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
    return json({ summary })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-summarize-roadmap:', msg)
    return json({ error: msg }, 500)
  }
})
