'use client'

import { useParams } from 'next/navigation'
import { useTracks } from '@/hooks/useTracks'
import { SplitsPanel } from '@/components/splits/SplitsPanel'

export default function SplitsPage() {
  const params = useParams()
  const projectId = params.id as string
  const { data: tracks = [], isLoading } = useTracks(projectId)

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-3 max-w-3xl mx-auto">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <SplitsPanel
      projectId={projectId}
      tracks={tracks.map(t => ({ id: t.id, title: t.title }))}
    />
  )
}
