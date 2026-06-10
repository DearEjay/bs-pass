import { requireAuth } from '../_shared/auth.ts'
import { db } from '../_shared/db.ts'

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
    const { projectId, taskIds } = await req.json()
    if (!projectId || !taskIds?.length) return json({ error: 'projectId and taskIds required' }, 400)

    const supabase = db()

    // Load assigned tasks with assignee profiles
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, due_date, priority, assignee_id, profiles:assignee_id(display_name)')
      .in('id', taskIds)
      .not('assignee_id', 'is', null)

    if (!tasks?.length) return json({ skipped: true })

    // Group tasks by assignee
    const byAssignee = new Map<string, { name: string; tasks: typeof tasks }>()
    for (const t of tasks) {
      if (!t.assignee_id) continue
      const name = (t.profiles as { display_name: string | null } | null)?.display_name ?? 'there'
      if (!byAssignee.has(t.assignee_id)) byAssignee.set(t.assignee_id, { name, tasks: [] })
      byAssignee.get(t.assignee_id)!.tasks.push(t)
    }

    // Post one message per assignee (or one combined message if multiple)
    const messages: string[] = []
    for (const { name, tasks: assigned } of byAssignee.values()) {
      const mention = `@${name}`
      if (assigned.length === 1) {
        const t = assigned[0]
        const due = t.due_date ? ` (due ${t.due_date})` : ''
        const desc = t.description ? ` — ${t.description}` : ''
        messages.push(`${mention} you've been assigned: ${t.title}${due}${desc}`)
      } else {
        const list = assigned.map(t => {
          const due = t.due_date ? ` (due ${t.due_date})` : ''
          return `  • ${t.title}${due}`
        }).join('\n')
        messages.push(`${mention} you've been assigned ${assigned.length} tasks:\n${list}`)
      }
    }

    if (messages.length === 0) return json({ skipped: true })

    const body = messages.join('\n\n')
    await supabase.from('chat_messages').insert({
      project_id: projectId,
      sender_type: 'agent',
      body,
    })

    return json({ success: true })

  } catch (err) {
    if (err instanceof Response) return err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent-notify-assignment:', msg)
    return json({ error: msg }, 500)
  }
})
