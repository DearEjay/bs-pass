'use client'

import { useState } from 'react'
import { useTracks } from '@/hooks/useTracks'
import { TrackItem } from './TrackItem'
import { AddTrackModal } from './AddTrackModal'
import { Plus, Music } from 'lucide-react'

export function TrackList({ projectId }: { projectId: string }) {
  const { data: tracks, isLoading, error } = useTracks(projectId)
  const [showAdd, setShowAdd] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border last:border-0 animate-pulse bg-accent/20" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {tracks?.length === 0
            ? 'No tracks yet'
            : `${tracks?.length} track${tracks?.length === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Add track
        </button>
      </div>

      {tracks?.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-lg py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Music size={32} strokeWidth={1.5} />
          <p className="text-sm">Add your first track to get started</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm text-primary hover:underline"
          >
            Add track
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg">
          {tracks?.map(track => (
            <TrackItem key={track.id} track={track} projectId={projectId} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddTrackModal projectId={projectId} onClose={() => setShowAdd(false)} />
      )}
    </>
  )
}
