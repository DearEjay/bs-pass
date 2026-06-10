'use client'

import { useQuery } from '@tanstack/react-query'
import { generateText } from '@/lib/gemini-client'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { TaskWithDeps } from '@/hooks/useTasks'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

interface Props {
  project: { title: string; project_type: string }
  tasks: TaskWithDeps[]
  tracks: Track[]
  displayName: string
}

export function RoadmapAISummary({ project, tasks, tracks, displayName }: Props) {
  const done = tasks.filter(t => t.status === 'complete').length
  const total = tasks.length
  const overdue = tasks.filter(t =>
    t.due_date && t.status !== 'complete' && new Date(t.due_date) < new Date()
  )

  // Re-fetch when the completion state or overdue state changes
  const summaryKey = `${done}/${total}:${overdue.length}`

  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['roadmap-summary', project.title, summaryKey],
    queryFn: async () => {
      const trackSummary = tracks.length > 0
        ? tracks.map(t => `- ${t.title} (${t.current_status})`).join('\n')
        : '(no tracks yet)'

      const taskSummary = tasks.length > 0
        ? tasks.map(t => `- [${t.status === 'complete' ? 'done' : t.status}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')
        : '(no tasks yet)'

      const prompt = `You are a music project manager assistant. Write a SHORT 1-3 sentence project status update addressed directly to ${displayName}.
Start with "Hey ${displayName}," and then give a conversational, encouraging status read of the project.
Only flag something as urgent if there is an overdue task or a critical blocker.
Keep it casual and concise — no bullet points, just natural sentences.

PROJECT: "${project.title}" (${project.project_type})
TASKS: ${done} of ${total} complete
OVERDUE TASKS: ${overdue.map(t => t.title).join(', ') || 'none'}

TRACKS:
${trackSummary}

ROADMAP TASKS:
${taskSummary}`

      return generateText(prompt)
    },
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: tasks.length > 0 || tracks.length > 0,
    retry: false,
  })

  if (!tasks.length && !tracks.length) return null

  return (
    <div className="relative rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-4 min-h-[80px] flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Sparkles size={15} className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        {isLoading || isFetching ? (
          <div className="space-y-2 py-1">
            <div className="h-3.5 w-3/4 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-3.5 w-1/2 rounded-full bg-muted/40 animate-pulse" />
          </div>
        ) : summary ? (
          <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Could not generate summary.</p>
        )}
      </div>

      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
        title="Refresh summary"
      >
        <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}
