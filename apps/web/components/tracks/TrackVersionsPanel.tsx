'use client'

import { useState } from 'react'
import {
  useTrackVersions,
  useDeleteTrackVersion,
  useRestoreTrackVersion,
  type TrackVersion,
} from '@/hooks/useTracks'
import { RotateCcw, Trash2, X, CheckCircle2, Clock, Plus, SplitSquareHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

interface TrackVersionsPanelProps {
  track: Track
  projectId: string
  onAddVersion?: () => void
  compareAId?: string | null
  compareBId?: string | null
  onSelectA?: (version: TrackVersion) => void
  onSelectB?: (version: TrackVersion) => void
  onClearCompare?: () => void
}

export function TrackVersionsPanel({
  track,
  projectId,
  onAddVersion,
  compareAId,
  compareBId,
  onSelectA,
  onSelectB,
  onClearCompare,
}: TrackVersionsPanelProps) {
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

  const selectingB = !!compareAId && !compareBId
  const comparingActive = !!(compareAId && compareBId)

  return (
    <div className="px-3 pb-3 pt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock size={11} />
          Version history
          <span className="opacity-50">({versions.length})</span>
        </p>
        <div className="flex items-center gap-1.5">
          {(compareAId || compareBId) && onClearCompare && (
            <button
              onClick={onClearCompare}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X size={11} />
              Cancel compare
            </button>
          )}
          {onAddVersion && (
            <button
              onClick={onAddVersion}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
            >
              <Plus size={11} />
              Add version
            </button>
          )}
        </div>
      </div>

      {selectingB && (
        <p className="text-[11px] text-primary mb-2 px-0.5">Select Version B to compare against</p>
      )}

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No versions found.</p>
      ) : (
        <div className="space-y-1">
          {versions.map(v => {
            const isCurrent = v.id === track.current_version_id
            const isConfirming = confirmDeleteId === v.id
            const canDelete = versions.length > 1
            const isA = compareAId === v.id
            const isB = compareBId === v.id

            return (
              <div
                key={v.id}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors',
                  isCurrent
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-accent/30 border border-transparent',
                  isA && 'ring-1 ring-indigo-400/50',
                  isB && 'ring-1 ring-emerald-400/50',
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
                  {isCurrent && <span className="text-primary/60">· Current</span>}
                  {isA && <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-1 py-0.5 rounded">A</span>}
                  {isB && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded">B</span>}
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {v.created_at
                      ? new Date(v.created_at).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
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
                      {/* Compare A/B selection buttons */}
                      {onSelectA && v.file_path && !isConfirming && (
                        <>
                          {isA ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-indigo-500 font-medium">
                              <SplitSquareHorizontal size={11} />
                              Ver. A
                            </span>
                          ) : isB ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 font-medium">
                              Ver. B
                            </span>
                          ) : selectingB && onSelectB ? (
                            // A is set — this version can be selected as B
                            <button
                              onClick={() => onSelectB(v)}
                              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors font-medium"
                            >
                              Select B
                            </button>
                          ) : !comparingActive ? (
                            // No compare active — any version can be selected as A
                            <button
                              onClick={() => onSelectA(v)}
                              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded text-muted-foreground hover:bg-accent transition-colors"
                              title="Set as Version A"
                            >
                              <SplitSquareHorizontal size={11} />
                              Compare
                            </button>
                          ) : null}
                        </>
                      )}
                      {/* Restore — hide while comparing */}
                      {!isCurrent && !isA && !isB && (
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
                      {/* Delete — hide while comparing */}
                      {!isA && !isB && (
                        <button
                          onClick={() => setConfirmDeleteId(v.id)}
                          disabled={!canDelete}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                          title={canDelete ? 'Delete this version permanently' : 'Cannot delete the only version'}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
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
