'use client'

import { useState, useCallback, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  useUpdateTrackTitle,
  useUpdateTrackStatus,
  useDeleteTrack,
  useRestoreDeletedTrack,
  useTrackVersions,
  useTrackAudioUrl,
  useVersionAudioUrl,
  useUploadTrackVersion,
  TRACK_STATUSES,
  type TrackStatus,
  type TrackVersion,
} from '@/hooks/useTracks'
import { useUndoToastStore } from '@/hooks/useUndoToast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTrackComments } from '@/hooks/useTrackComments'
import { TrackStatusBadge, STATUS_CONFIG } from './TrackStatusBadge'
import { AudioPlayer, type AudioMarker, type AudioPlayerHandle, type RepeatMode } from './AudioPlayer'
import { TrackComments } from './TrackComments'
import { TrackVersionsPanel } from './TrackVersionsPanel'
import { TrackABPlayer } from './TrackABPlayer'
import { TrackStemsTab } from './TrackStemsTab'
import { TrackLyricsTab } from './TrackLyricsTab'
import { TrackCreditsTab } from './TrackCreditsTab'
import { TrackMetadataTab } from './TrackMetadataTab'
import { TrackAssetsTab } from './TrackAssetsTab'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']
type ActiveTab = 'player' | 'stems' | 'credits' | 'assets' | 'info'

interface TrackItemProps {
  track: Track
  projectId: string
  isExpanded: boolean
  autoPlay: boolean
  onToggleExpand: () => void
  onEnded: () => void
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  repeatMode: RepeatMode
  shuffleMode: boolean
  onRepeatChange: (mode: RepeatMode) => void
  onShuffleToggle: () => void
}

export function TrackItem({
  track,
  projectId,
  isExpanded,
  autoPlay,
  onToggleExpand,
  onEnded,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  repeatMode,
  shuffleMode,
  onRepeatChange,
  onShuffleToggle,
}: TrackItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const updateTitle = useUpdateTrackTitle(projectId)
  const updateStatus = useUpdateTrackStatus(projectId)
  const deleteTrack = useDeleteTrack(projectId)
  const restoreTrack = useRestoreDeletedTrack(projectId)
  const uploadVersion = useUploadTrackVersion(track.id, projectId)
  const pushToast = useUndoToastStore(s => s.push)
  const { data: versions = [] } = useTrackVersions(track.id)
  const { data: currentUser } = useCurrentUser()
  const { data: audioUrl } = useTrackAudioUrl(track, isExpanded)
  const { data: comments = [] } = useTrackComments(track.id, track.current_version_id ?? null)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const [confirmDeleteTrack, setConfirmDeleteTrack] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('player')
  const [currentTime, setCurrentTime] = useState(0)
  // A/B compare: 2-step selection — pick A first, then B
  const [compareA, setCompareA] = useState<TrackVersion | null>(null)
  const [compareB, setCompareB] = useState<TrackVersion | null>(null)
  const playerRef = useRef<AudioPlayerHandle>(null)
  const versionUploadRef = useRef<HTMLInputElement>(null)

  const { data: compareAUrl } = useVersionAudioUrl(compareA?.file_path ?? null)
  const { data: compareBUrl } = useVersionAudioUrl(compareB?.file_path ?? null)

  const hasAudio = !!track.current_version_id
  const currentVersion = versions.find(v => v.id === track.current_version_id) ?? null

  const markers: AudioMarker[] = comments.map(c => ({
    id: c.id,
    timestamp: c.timestamp_secs,
    body: c.body,
    authorName: c.profiles?.display_name ?? 'Unknown',
    authorAvatarUrl: c.profiles?.avatar_url ?? null,
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
    const trackId = track.id
    const trackTitle = track.title
    setShowEllipsisMenu(false)
    await deleteTrack.mutateAsync(trackId)
    pushToast(`"${trackTitle}" deleted`, async () => {
      await restoreTrack.mutateAsync(trackId)
    })
  }

  async function handleDownload() {
    if (!track.current_version_id) return
    setShowEllipsisMenu(false)
    setIsDownloading(true)
    try {
      const supabase = createClient()
      const { data: version } = await supabase
        .from('track_versions')
        .select('file_path')
        .eq('id', track.current_version_id)
        .single()
      if (!version?.file_path) return
      const ext = version.file_path.split('.').pop() ?? 'mp3'
      const { data } = await supabase.storage.from('tracks').createSignedUrl(
        version.file_path,
        300,
        { download: `${track.title}.${ext}` },
      )
      if (!data?.signedUrl) return
      const a = document.createElement('a')
      a.href = data.signedUrl
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleVersionFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadVersion.mutateAsync({ file })
    } finally {
      e.target.value = ''
    }
  }


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
              <div className="dropdown-menu right-0 top-full mt-1 w-36">
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
        <div className="btn-ellipsis">
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
              <div className="dropdown-menu right-0 top-full mt-1 w-48">
                {!confirmDeleteTrack ? (
                  <>
                    <button
                      onClick={handleDownload}
                      disabled={!track.current_version_id || isDownloading}
                      className="dropdown-item disabled:opacity-40"
                    >
                      <Download size={13} className="shrink-0" />
                      {isDownloading ? 'Preparing…' : 'Download track'}
                    </button>
                    <div className="border-t border-border/50 my-1" />
                    <button
                      onClick={() => setConfirmDeleteTrack(true)}
                      className="dropdown-item-destructive"
                    >
                      <Trash2 size={13} className="shrink-0" />
                      Delete track
                    </button>
                  </>
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
            {([
              { id: 'player',  label: 'Audio' },
              { id: 'stems',   label: 'Stems' },
              { id: 'credits', label: 'Credits' },
              { id: 'assets',  label: 'Assets' },
              { id: 'info',    label: 'Metadata' },
            ] as { id: ActiveTab; label: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 text-xs font-medium transition-colors shrink-0 whitespace-nowrap',
                  activeTab === tab.id
                    ? 'text-foreground border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* AudioPlayer always mounted when audio is available — keeps playback alive across tabs */}
          {audioUrl ? (
            <div className={cn(activeTab !== 'player' && 'hidden')}>
              <AudioPlayer
                ref={playerRef}
                trackId={track.id}
                audioUrl={audioUrl}
                markers={markers}
                autoPlay={autoPlay}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPrev={onPrev}
                onNext={onNext}
                repeatMode={repeatMode}
                shuffleMode={shuffleMode}
                onRepeatChange={onRepeatChange}
                onShuffleToggle={onShuffleToggle}
              />
              {currentUser && activeTab === 'player' && (
                <TrackComments
                  trackId={track.id}
                  trackVersionId={track.current_version_id ?? null}
                  projectId={projectId}
                  currentUserId={currentUser.id}
                  currentPlaybackTime={currentTime}
                  onSeek={(t) => playerRef.current?.seekTo(t)}
                />
              )}
            </div>
          ) : activeTab === 'player' ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Loading audio…
            </div>
          ) : null}

          {/* Version history lives inside the Audio tab */}
          {activeTab === 'player' && (
            <>
              <TrackVersionsPanel
                track={track}
                projectId={projectId}
                onAddVersion={() => versionUploadRef.current?.click()}
                compareAId={compareA?.id ?? null}
                compareBId={compareB?.id ?? null}
                onSelectA={(v) => { setCompareA(v); setCompareB(null) }}
                onSelectB={(v) => setCompareB(v)}
                onClearCompare={() => { setCompareA(null); setCompareB(null) }}
              />
              {compareA && compareAUrl && compareB && compareBUrl && (
                <TrackABPlayer
                  versionA={{ url: compareAUrl, label: compareA.version_label }}
                  versionB={{ url: compareBUrl, label: compareB.version_label }}
                  onClose={() => { setCompareA(null); setCompareB(null) }}
                />
              )}
            </>
          )}

          {activeTab === 'stems' && (
            <TrackStemsTab
              trackId={track.id}
              projectId={projectId}
              trackVersionId={track.current_version_id ?? null}
              trackVersionLabel={currentVersion?.version_label ?? 'v1'}
              trackTitle={track.title}
              canEdit={true}
            />
          )}

          {activeTab === 'credits' && (
            <TrackCreditsTab trackId={track.id} projectId={projectId} />
          )}

          {activeTab === 'assets' && (
            <TrackAssetsTab trackId={track.id} projectId={projectId} />
          )}

          {activeTab === 'info' && (
            <>
              <TrackLyricsTab track={track} projectId={projectId} />
              <div className="border-t border-border/50" />
              <TrackMetadataTab track={track} projectId={projectId} />
            </>
          )}
        </div>
      )}


      <input
        ref={versionUploadRef}
        type="file"
        accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
        className="hidden"
        onChange={handleVersionFileSelect}
      />
    </div>
  )
}
