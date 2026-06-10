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
    const { projectId, displayName } = await req.json()
    if (!projectId) return json({ error: 'projectId required' }, 400)

    const supabase = db()

    const [{ data: project }, { data: tasks }, { data: tracks }] = await Promise.all([
      supabase.from('projects').select('title,project_type').eq('id', projectId).single(),
      supabase.from('tasks').select('title,status,due_date').eq('project_id', projectId).is('deleted_at', null),
      supabase.from('tracks').select('title,current_status').eq('project_id', projectId).is('deleted_at', null),
    ])

    if (!project) return json({ error: 'not found' }, 404)

    const done = (tasks ?? []).filter((t: { status: string }) => t.status === 'complete').length
    const total = (tasks ?? []).length
    const today = new Date().toISOString().split('T')[0]
    const overdue = (tasks ?? []).filter((t: { status: string; due_date: string | null }) =>
      t.due_date && t.status !== 'complete' && t.due_date < today
    ).map((t: { title: string }) => t.title)

    const trackSummary = (tracks ?? []).length > 0
      ? (tracks as { title: string; current_status: string }[]).map(t => `- ${t.title} (${t.current_status})`).join('\n')
      : '(no tracks yet)'

    const taskSummary = total > 0
      ? (tasks as { title: string; status: string; due_date: string | null }[])
          .map(t => `- [${t.status}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')
      : '(no tasks yet)'

    const name = displayName || 'there'
    const prompt = `You are a music project manager assistant. Write a SHORT 1-3 sentence project status update addressed directly to ${name}.
Start with "Hey ${name}," then give a conversational, encouraging status read.
Only flag something as urgent if there is an overdue task or critical blocker.
Keep it casual — no bullet points, just natural sentences.

PROJECT: "${project.title}" (${project.project_type})
TASKS: ${done} of ${total} complete
OVERDUE: ${overdue.join(', ') || 'none'}
TRACKS:\n${trackSummary}
ROADMAP:\n${taskSummary}`

    const summary = await generateContent([{ role: 'user', parts: [{ text: prompt }] }])
    return json({ summary })

  } catch (err) {
    if (err instanceof Response) return err
    console.error('agent-summarize-roadmap:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
