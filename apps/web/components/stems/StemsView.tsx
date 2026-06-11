'use client'

import { useState } from 'react'
import {
  useProjectStems,
  useStemVersions,
  useRollbackStemVersion,
  useRenameStem,
  useDeleteStem,
  type Stem,
  type TrackWithStems,
} from '@/hooks/useStems'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useCollaborators } from '@/hooks/useCollaborators'
import { StemUploadModal } from './StemUploadModal'
import {
  Plus, MoreHorizontal, ChevronDown, ChevronRight,
  Music2, RotateCcw, Trash2, Pencil, Check, X, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

function formatBytes(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(secs: number | null) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StemVersionsPanel({
  stem,
  projectId,
  currentVersionId,
}: {
  stem: Stem
  projectId: string
  currentVersionId: string | null
}) {
  const { data: versions = [], isLoading } = useStemVersions(stem.id)
  const rollback = useRollbackStemVersion(stem.id, projectId)

  if (isLoading) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Loading versions…</div>
  }

  return (
    <div className="border-t border-border/50 bg-accent/5">
      {versions.map(v => (
        <div
          key={v.id}
          className={cn(
            'flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 border-border/30',
            v.id === currentVersionId && 'bg-primary/5',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium">v{v.version_number}</span>
            {v.id === currentVersionId && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium">
                Current
              </span>
            )}
            {v.created_at && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(v.created_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          {v.id !== currentVersionId && (
            <button
              onClick={() => rollback.mutate({ versionId: v.id, storagePath: v.storage_path })}
              disabled={rollback.isPending}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-accent transition-colors disabled:opacity-50"
            >
              <RotateCcw size={11} />
              Restore
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function StemRow({
  stem,
  projectId,
  trackId,
  trackVersionId,
  trackVersionLabel,
  canEdit,
}: {
  stem: Stem
  projectId: string
  trackId: string
  trackVersionId: string
  trackVersionLabel: string
  canEdit: boolean
}) {
  const renameStem = useRenameStem(projectId)
  const deleteStem = useDeleteStem(projectId)

  const [showVersions, setShowVersions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [showVersionUpload, setShowVersionUpload] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function startRename() {
    setNameDraft(stem.name)
    setEditing(true)
    setShowMenu(false)
  }

  async function commitRename() {
    const trimmed = nameDraft.trim()
    setEditing(false)
    if (trimmed && trimmed !== stem.name) {
      await renameStem.mutateAsync({ stemId: stem.id, name: trimmed })
    }
  }

  return (
    <div className="group">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
        {/* Expand versions toggle */}
        <button
          onClick={() => setShowVersions(v => !v)}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
        >
          {showVersions ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Stem icon */}
        <Music2 size={14} className="text-muted-foreground/60 shrink-0" />

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="flex-1 text-sm font-medium bg-input border border-primary rounded px-2 py-0.5 focus:outline-none"
              />
              <button onClick={commitRename} className="p-1 text-primary hover:opacity-70">
                <Check size={13} />
              </button>
              <button onClick={() => setEditing(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium truncate">{stem.name}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            {stem.current_version && (
              <span className="font-mono">v{stem.current_version.version_number}</span>
            )}
            {formatBytes(stem.file_size_bytes) && (
              <span>{formatBytes(stem.file_size_bytes)}</span>
            )}
            {formatDuration(stem.duration_secs) && (
              <span>{formatDuration(stem.duration_secs)}</span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add version */}
            <button
              onClick={() => setShowVersionUpload(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-accent transition-colors"
            >
              <Plus size={11} />
              Version
            </button>

            {/* Overflow menu */}
            <div className="relative">
              <button
                onClick={() => { setShowMenu(m => !m); setConfirmDelete(false) }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                    <button
                      onClick={startRename}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <Pencil size={12} />
                      Rename
                    </button>
                    <div className="border-t border-border my-1" />
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                      >
                        <Trash2 size={12} />
                        Delete stem
                      </button>
                    ) : (
                      <div className="px-3 py-2 space-y-1.5">
                        <p className="text-xs text-muted-foreground">Delete this stem?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => { deleteStem.mutate(stem.id); setShowMenu(false) }}
                            disabled={deleteStem.isPending}
                            className="flex-1 py-1 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/10 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showVersions && (
        <StemVersionsPanel
          stem={stem}
          projectId={projectId}
          currentVersionId={stem.current_stem_version_id}
        />
      )}

      {showVersionUpload && (
        <StemUploadModal
          mode="version"
          projectId={projectId}
          trackId={trackId}
          stemId={stem.id}
          stemName={stem.name}
          trackVersionId={trackVersionId}
          trackVersionLabel={trackVersionLabel}
          onClose={() => setShowVersionUpload(false)}
        />
      )}
    </div>
  )
}

function TrackStemsSection({
  track,
  projectId,
  canEdit,
}: {
  track: TrackWithStems
  projectId: string
  canEdit: boolean
}) {
  const [showUpload, setShowUpload] = useState(false)
  const trackVersionLabel = track.current_version?.version_label ?? 'v1'
  const trackVersionId = track.current_version_id ?? ''

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Track header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
        <div>
          <span className="text-sm font-semibold">{track.title}</span>
          {track.current_version && (
            <span className="ml-2 text-xs text-muted-foreground font-mono">
              {trackVersionLabel}
            </span>
          )}
        </div>
        {canEdit && trackVersionId && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border hover:bg-accent transition-colors"
          >
            <Plus size={12} />
            Add stem
          </button>
        )}
      </div>

      {/* Stem list */}
      {track.stems.length > 0 ? (
        <div className="divide-y divide-border/50">
          {track.stems.map(stem => (
            <StemRow
              key={stem.id}
              stem={stem}
              projectId={projectId}
              trackId={track.id}
              trackVersionId={trackVersionId}
              trackVersionLabel={trackVersionLabel}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-5 text-center text-xs text-muted-foreground">
          No stems yet.{canEdit && ' Click "Add stem" to upload one.'}
        </div>
      )}

      {showUpload && trackVersionId && (
        <StemUploadModal
          mode="new"
          projectId={projectId}
          trackId={track.id}
          trackTitle={track.title}
          trackVersionId={trackVersionId}
          trackVersionLabel={trackVersionLabel}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}

export function StemsView({ projectId }: { projectId: string }) {
  const { data: tracks = [], isLoading, error } = useProjectStems(projectId)
  const { data: collaborators = [] } = useCollaborators(projectId)
  const { data: currentUser } = useCurrentUser()

  const isCollaborator = collaborators.some(c => c.user_id === currentUser?.id)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="border border-border rounded-lg overflow-hidden">
            <div className="h-12 bg-muted/30 animate-pulse" />
            <div className="h-12 bg-muted/10 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }

  if (tracks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Add tracks to this project to manage stems.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Stems</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Audio stems per track, versioned and linked to their track version
        </p>
      </div>

      <div className="space-y-3">
        {tracks.map(track => (
          <TrackStemsSection
            key={track.id}
            track={track}
            projectId={projectId}
            canEdit={isCollaborator}
          />
        ))}
      </div>
    </div>
  )
}
