'use client'

import { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useUpdateTrackStatus,
  useDeleteTrack,
  useTrackAudioUrl,
  TRACK_STATUSES,
  type TrackStatus,
} from '@/hooks/useTracks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTrackComments } from '@/hooks/useTrackComments'
import { TrackStatusBadge, STATUS_CONFIG } from './TrackStatusBadge'
import { AudioPlayer, type AudioMarker } from './AudioPlayer'
import { TrackComments } from './TrackComments'
import { GripVertical, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

interface TrackItemProps {
  track: Track
  projectId: string
  isExpanded: boolean
  autoPlay: boolean
  onToggleExpand: () => void
  onEnded: () => void
}

export function TrackItem({
  track,
  projectId,
  isExpanded,
  autoPlay,
  onToggleExpand,
  onEnded,
}: TrackItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const updateStatus = useUpdateTrackStatus(projectId)
  const deleteTrack = useDeleteTrack(projectId)
  const { data: currentUser } = useCurrentUser()
  const { data: audioUrl } = useTrackAudioUrl(track, isExpanded)
  const { data: comments = [] } = useTrackComments(track.id)

  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const hasAudio = !!track.current_version_id

  const markers: AudioMarker[] = comments.map(c => ({
    id: c.id,
    timestamp: c.timestamp_secs,
    isActive: Math.abs(currentTime - c.timestamp_secs) < 1.5,
  }))

  const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), [])
  const handleEnded = useCallback(() => onEnded(), [onEnded])

  async function handleStatusChange(status: TrackStatus) {
    setShowStatusMenu(false)
    await updateStatus.mutateAsync({ trackId: track.id, status })
  }

  async function handleDelete() {
    await deleteTrack.mutateAsync(track.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-opacity',
        isDragging && 'opacity-40',
      )}
    >
      {/* ── Collapsed row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-3 hover:bg-accent/30 group transition-colors">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
          aria-label="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical size={16} />
        </button>

        {/* Expand toggle + track info */}
        <button
          onClick={onToggleExpand}
          disabled={!hasAudio}
          className="flex-1 min-w-0 flex items-center gap-2 text-left disabled:cursor-default"
        >
          <span className={cn(
            'text-muted-foreground/50 transition-colors shrink-0',
            hasAudio && 'group-hover:text-muted-foreground',
          )}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{track.title}</p>
            {(track.bpm || track.key) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </button>

        {/* Status selector */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            disabled={updateStatus.isPending}
          >
            <TrackStatusBadge status={track.current_status as TrackStatus} />
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>

          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                {TRACK_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left',
                      s === track.current_status && 'bg-accent',
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[s].dot)} />
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteTrack.isPending}
                className="px-2 py-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded panel ──────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-accent/10">
          {audioUrl ? (
            <>
              <AudioPlayer
                trackId={track.id}
                audioUrl={audioUrl}
                markers={markers}
                autoPlay={autoPlay}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
              {currentUser && (
                <TrackComments
                  trackId={track.id}
                  projectId={projectId}
                  currentUserId={currentUser.id}
                  currentPlaybackTime={currentTime}
                />
              )}
            </>
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Loading audio…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
