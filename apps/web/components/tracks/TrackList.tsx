'use client'

import { useState, useCallback } from 'react'
import { useTracks, useReorderTracks } from '@/hooks/useTracks'
import { TrackItem } from './TrackItem'
import { AddTrackModal } from './AddTrackModal'
import { Plus, Music } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

export function TrackList({ projectId }: { projectId: string }) {
  const { data: tracks = [], isLoading, error } = useTracks(projectId)
  const reorderTracks = useReorderTracks(projectId)

  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [autoPlayId, setAutoPlayId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const oldIdx = tracks.findIndex(t => t.id === active.id)
    const newIdx = tracks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tracks, oldIdx, newIdx)
    reorderTracks.mutate(reordered.map(t => t.id))
  }

  const handleTrackEnded = useCallback((trackId: string) => {
    const idx = tracks.findIndex(t => t.id === trackId)
    const next = tracks[idx + 1]
    if (next) {
      setExpandedId(next.id)
      setAutoPlayId(next.id)
    } else {
      // Last track finished — collapse
      setExpandedId(null)
      setAutoPlayId(null)
    }
  }, [tracks])

  function toggleExpand(trackId: string) {
    if (expandedId === trackId) {
      setExpandedId(null)
      setAutoPlayId(null)
    } else {
      setExpandedId(trackId)
      setAutoPlayId(null) // manual expand, no auto-play
    }
  }

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
          {tracks.length === 0
            ? 'No tracks yet'
            : `${tracks.length} track${tracks.length === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Add track
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-lg py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Music size={32} strokeWidth={1.5} />
          <p className="text-sm">Add your first track to get started</p>
          <button onClick={() => setShowAdd(true)} className="text-sm text-primary hover:underline">
            Add track
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tracks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
              {tracks.map(track => (
                <TrackItem
                  key={track.id}
                  track={track}
                  projectId={projectId}
                  isExpanded={expandedId === track.id}
                  autoPlay={autoPlayId === track.id}
                  onToggleExpand={() => toggleExpand(track.id)}
                  onEnded={() => handleTrackEnded(track.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAdd && (
        <AddTrackModal projectId={projectId} onClose={() => setShowAdd(false)} />
      )}
    </>
  )
}
