'use client'

import { useState } from 'react'
import {
  useTrackVersions,
  useDeleteTrackVersion,
  useRestoreTrackVersion,
  type TrackVersion,
} from '@/hooks/useTracks'
import { RotateCcw, Trash2, X, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

interface TrackVersionsPanelProps {
  track: Track
  projectId: string
}

export function TrackVersionsPanel({ track, projectId }: TrackVersionsPanelProps) {
  const { data: versions = [], isLoading } = useTrackVersions(track.id)
  const deleteVersion = useDeleteTrackVersion(track.id, projectId)
  const restoreVersion = useRestoreTrackVersion(track.id, projectId)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="px-4 py-3 text-xs text-muted-foreground animate-pulse">
        Loading versions…
      </div>
    )
  }

  async function handleDelete(v: TrackVersion) {
    await deleteVersion.mutateAsync({
      versionId: v.id,
      filePath: v.file_path,
      isCurrentVersion: v.id === track.current_version_id,
    })
    setConfirmDeleteId(null)
  }

  return (
    <div className="px-3 pb-3 pt-2">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Clock size={11} />
        Version history
        <span className="opacity-50">({versions.length})</span>
      </p>

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No versions found.</p>
      ) : (
        <div className="space-y-1">
          {versions.map(v => {
            const isCurrent = v.id === track.current_version_id
            const isConfirming = confirmDeleteId === v.id
            const canDelete = versions.length > 1

            return (
              <div
                key={v.id}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors',
                  isCurrent
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent/30 border border-transparent',
                )}
              >
                {/* Version info */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {isCurrent
                    ? <CheckCircle2 size={12} className="text-primary shrink-0" />
                    : <span className="w-3 shrink-0" />
                  }
                  <span className={cn('font-medium tabular-nums', isCurrent && 'text-primary')}>
                    {v.version_label}
                  </span>
                  {isCurrent && (
                    <span className="text-primary/60 text-xs">· Current</span>
                  )}
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {v.created_at
                      ? new Date(v.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Delete?</span>
                      <button
                        onClick={() => handleDelete(v)}
                        disabled={deleteVersion.isPending}
                        className="px-2 py-0.5 text-destructive border border-destructive/40 rounded hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {!isCurrent && (
                        <button
                          onClick={() => restoreVersion.mutate(v.id)}
                          disabled={restoreVersion.isPending}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                          title="Restore this version as current"
                        >
                          <RotateCcw size={11} />
                          Restore
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDeleteId(v.id)}
                        disabled={!canDelete}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                        title={
                          canDelete
                            ? 'Delete this version permanently'
                            : 'Cannot delete the only version'
                        }
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
