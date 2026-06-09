'use client'

import { useState } from 'react'
import { useUpdateTrackStatus, useDeleteTrack, TRACK_STATUSES, type TrackStatus } from '@/hooks/useTracks'
import { TrackStatusBadge, STATUS_CONFIG } from './TrackStatusBadge'
import { ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

export function TrackItem({ track, projectId }: { track: Track; projectId: string }) {
  const updateStatus = useUpdateTrackStatus(projectId)
  const deleteTrack = useDeleteTrack(projectId)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleStatusChange(status: TrackStatus) {
    setShowStatusMenu(false)
    await updateStatus.mutateAsync({ trackId: track.id, status })
  }

  async function handleDelete() {
    await deleteTrack.mutateAsync(track.id)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-accent/30 group transition-colors">
      {/* Track title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{track.title}</p>
        {(track.bpm || track.key) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {[track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

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
  )
}
