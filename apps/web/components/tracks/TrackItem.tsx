'use client'

import { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useUpdateTrackTitle,
  useUpdateTrackStatus,
  useDeleteTrack,
  useDeleteTrackVersion,
  useTrackVersions,
  useTrackAudioUrl,
  TRACK_STATUSES,
  type TrackStatus,
} from '@/hooks/useTracks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTrackComments } from '@/hooks/useTrackComments'
import { TrackStatusBadge, STATUS_CONFIG } from './TrackStatusBadge'
import { AudioPlayer, type AudioMarker } from './AudioPlayer'
import { TrackComments } from './TrackComments'
import { TrackVersionsPanel } from './TrackVersionsPanel'
import { VersionUploadModal } from './VersionUploadModal'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']
type ActiveTab = 'player' | 'versions'

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
  const style = { transform: CSS.Transform.toString(transform), transition }

  const updateTitle = useUpdateTrackTitle(projectId)
  const updateStatus = useUpdateTrackStatus(projectId)
  const deleteTrack = useDeleteTrack(projectId)
  const deleteVersion = useDeleteTrackVersion(track.id, projectId)
  const { data: versions = [] } = useTrackVersions(track.id)
  const { data: currentUser } = useCurrentUser()
  const { data: audioUrl } = useTrackAudioUrl(track, isExpanded)
  const { data: comments = [] } = useTrackComments(track.id)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const [showVersionUpload, setShowVersionUpload] = useState(false)
  const [showDeleteVersionModal, setShowDeleteVersionModal] = useState(false)
  const [confirmDeleteTrack, setConfirmDeleteTrack] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('player')
  const [currentTime, setCurrentTime] = useState(0)

  const hasAudio = !!track.current_version_id
  const currentVersion = versions.find(v => v.id === track.current_version_id) ?? null

  const markers: AudioMarker[] = comments.map(c => ({
    id: c.id,
    timestamp: c.timestamp_secs,
    isActive: Math.abs(currentTime - c.timestamp_secs) < 1.5,
  }))

  const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), [])
  const handleEnded = useCallback(() => onEnded(), [onEnded])

  function startEditTitle() {
    setTitleDraft(track.title)
    setEditingTitle(true)
  }

  async function commitTitle() {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (trimmed && trimmed !== track.title) {
      await updateTitle.mutateAsync({ trackId: track.id, title: trimmed })
    }
  }

  function cancelTitle() {
    setEditingTitle(false)
    setTitleDraft('')
  }

  async function handleStatusChange(status: TrackStatus) {
    setShowStatusMenu(false)
    await updateStatus.mutateAsync({ trackId: track.id, status })
  }

  async function handleDeleteTrack() {
    await deleteTrack.mutateAsync(track.id)
  }

  async function handleDeleteCurrentVersion() {
    if (!currentVersion) return
    await deleteVersion.mutateAsync({
      versionId: currentVersion.id,
      filePath: currentVersion.file_path,
      isCurrentVersion: true,
    })
    setShowDeleteVersionModal(false)
  }

  function openVersionsTab() {
    setShowEllipsisMenu(false)
    setActiveTab('versions')
    if (!isExpanded) onToggleExpand()
  }

  // Previous version label for the confirmation modal
  const sortedVersions = [...versions].sort((a, b) => b.version_number - a.version_number)
  const prevVersion = sortedVersions.find(v => v.id !== track.current_version_id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('transition-opacity first:rounded-t-lg last:rounded-b-lg', isDragging && 'opacity-40')}
    >
      {/* ── Track row ─────────────────────────────────────────────────────── */}
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

        {/* Chevron */}
        <button
          onClick={onToggleExpand}
          disabled={!hasAudio}
          className={cn(
            'text-muted-foreground/50 transition-colors shrink-0 disabled:cursor-default',
            hasAudio && 'hover:text-muted-foreground',
          )}
          aria-label={isExpanded ? 'Collapse track' : 'Expand track'}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Title (click to edit) */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
                if (e.key === 'Escape') cancelTitle()
              }}
              className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none pb-px truncate"
            />
          ) : (
            <p
              onClick={startEditTitle}
              className="text-sm font-medium truncate cursor-text hover:text-primary/80 transition-colors"
              title="Click to rename"
            >
              {track.title}
            </p>
          )}
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
            className="hover:opacity-80 transition-opacity"
            disabled={updateStatus.isPending}
          >
            <TrackStatusBadge status={track.current_status as TrackStatus} />
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

        {/* Ellipsis menu */}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setShowEllipsisMenu(v => !v)
              setConfirmDeleteTrack(false)
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
            aria-label="Track options"
          >
            <MoreHorizontal size={15} />
          </button>

          {showEllipsisMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEllipsisMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                {/* Add new version */}
                <button
                  onClick={() => {
                    setShowEllipsisMenu(false)
                    setShowVersionUpload(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                >
                  <Plus size={13} className="text-muted-foreground shrink-0" />
                  Add new version
                </button>

                {/* Delete current version */}
                <button
                  onClick={() => {
                    setShowEllipsisMenu(false)
                    setShowDeleteVersionModal(true)
                  }}
                  disabled={!currentVersion || versions.length <= 1}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} className="text-muted-foreground shrink-0" />
                  Delete current version
                </button>

                {/* Restore from previous */}
                <button
                  onClick={openVersionsTab}
                  disabled={versions.length <= 1}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={13} className="text-muted-foreground shrink-0" />
                  Restore from a previous version
                </button>

                {/* Divider + Delete track */}
                <div className="border-t border-border my-1" />
                {!confirmDeleteTrack ? (
                  <button
                    onClick={() => setConfirmDeleteTrack(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
                  >
                    <Trash2 size={13} className="shrink-0" />
                    Delete track
                  </button>
                ) : (
                  <div className="px-3 py-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Delete this track?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteTrack(false)}
                        className="flex-1 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteTrack}
                        disabled={deleteTrack.isPending}
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

      {/* ── Expanded panel ──────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-accent/10">
          {/* Tab switcher */}
          <div className="flex border-b border-border/50">
            <button
              onClick={() => setActiveTab('player')}
              className={cn(
                'px-4 py-2 text-xs font-medium transition-colors',
                activeTab === 'player'
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Player
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={cn(
                'px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5',
                activeTab === 'versions'
                  ? 'text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Versions
              {versions.length > 0 && (
                <span className="text-muted-foreground/60">({versions.length})</span>
              )}
            </button>
          </div>

          {activeTab === 'player' && (
            <>
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
            </>
          )}

          {activeTab === 'versions' && (
            <TrackVersionsPanel track={track} projectId={projectId} />
          )}
        </div>
      )}

      {/* ── Delete version modal ──────────────────────────────────────────── */}
      {showDeleteVersionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-xs p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Delete current version?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">
                    {currentVersion?.version_label ?? 'This version'}
                  </span>{' '}
                  will be permanently deleted.
                  {prevVersion && (
                    <> The track will revert to{' '}
                      <span className="font-medium text-foreground">{prevVersion.version_label}</span>.
                    </>
                  )}
                </p>
              </div>
            </div>

            {deleteVersion.error && (
              <p className="text-destructive text-xs">{(deleteVersion.error as Error).message}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteVersionModal(false)}
                className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCurrentVersion}
                disabled={deleteVersion.isPending}
                className="flex-1 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deleteVersion.isPending ? 'Deleting…' : "Yes, I'm sure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload new version modal ────────────────────────────────────────── */}
      {showVersionUpload && (
        <VersionUploadModal
          trackId={track.id}
          projectId={projectId}
          trackTitle={track.title}
          onClose={() => setShowVersionUpload(false)}
        />
      )}
    </div>
  )
}
