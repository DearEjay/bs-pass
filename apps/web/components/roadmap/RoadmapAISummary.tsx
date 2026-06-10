'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { TaskWithDeps } from '@/hooks/useTasks'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

interface Props {
  projectId: string
  project: { title: string; project_type: string }
  tasks: TaskWithDeps[]
  tracks: Track[]
  displayName: string
}

async function fetchSummary(projectId: string, displayName: string): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-summarize-roadmap`
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId, displayName }),
  })
  if (!res.ok) throw new Error(`Summary failed: ${res.status}`)
  const { summary } = await res.json()
  return summary as string
}

export function RoadmapAISummary({ projectId, project, tasks, tracks, displayName }: Props) {
  const done = tasks.filter(t => t.status === 'complete').length
  const total = tasks.length

  // Refetch when completion state changes
  const summaryKey = `${done}/${total}`

  const { data: summary, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['roadmap-summary', projectId, summaryKey],
    queryFn: () => fetchSummary(projectId, displayName),
    staleTime: 5 * 60 * 1000,
    enabled: (tasks.length > 0 || tracks.length > 0),
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
        ) : error ? (
          <p className="text-sm text-muted-foreground italic">
            Could not generate summary — check Supabase edge function logs.
          </p>
        ) : summary ? (
          <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
        ) : null}
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
