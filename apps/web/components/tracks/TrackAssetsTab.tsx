'use client'

import { useState, useRef } from 'react'
import {
  useTrackAssets,
  useAddTrackAsset,
  useRemoveTrackAsset,
  useDownloadAsset,
  type TrackAsset,
} from '@/hooks/useTrackAssets'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import {
  Upload, Link, Download, ExternalLink, Trash2,
  Loader2, FileText, FileImage, FileAudio, FileVideo,
  File, Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatBytes(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileIcon({ mimeType, className }: { mimeType: string | null; className?: string }) {
  const cls = cn('shrink-0', className)
  if (!mimeType) return <File size={16} className={cls} />
  if (mimeType.startsWith('image/')) return <FileImage size={16} className={cls} />
  if (mimeType.startsWith('audio/')) return <FileAudio size={16} className={cls} />
  if (mimeType.startsWith('video/')) return <FileVideo size={16} className={cls} />
  if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document'))
    return <FileText size={16} className={cls} />
  return <File size={16} className={cls} />
}

function AssetCard({
  asset,
  canRemove,
  onRemove,
  isRemoving,
}: {
  asset: TrackAsset
  canRemove: boolean
  onRemove: () => void
  isRemoving: boolean
}) {
  const downloadAsset = useDownloadAsset()
  const isFile = asset.asset_type === 'file'

  function handleAction() {
    if (isFile && asset.storage_path) {
      downloadAsset.mutate({ storagePath: asset.storage_path, filename: asset.name })
    } else if (asset.external_url) {
      window.open(asset.external_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg hover:border-border/80 transition-colors">
      {/* Icon */}
      <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
        {isFile
          ? <FileIcon mimeType={asset.mime_type} className="text-muted-foreground" />
          : <Link size={15} className="text-muted-foreground" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{asset.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {asset.uploader_name ?? 'Unknown'}
          <span className="mx-1 opacity-40">·</span>
          {formatDate(asset.created_at)}
          {asset.file_size != null && (
            <>
              <span className="mx-1 opacity-40">·</span>
              {formatBytes(asset.file_size)}
            </>
          )}
          {!isFile && asset.external_url && (
            <>
              <span className="mx-1 opacity-40">·</span>
              <span className="truncate max-w-[120px] inline-block align-bottom">{asset.external_url}</span>
            </>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleAction}
          disabled={downloadAsset.isPending}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={isFile ? 'Download' : 'Open link'}
        >
          {downloadAsset.isPending
            ? <Loader2 size={13} className="animate-spin" />
            : isFile
            ? <Download size={13} />
            : <ExternalLink size={13} />
          }
        </button>
        {canRemove && (
          <button
            onClick={onRemove}
            disabled={isRemoving}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove asset"
          >
            {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        )}
      </div>
    </div>
  )
}

export function TrackAssetsTab({
  trackId,
  projectId,
}: {
  trackId: string
  projectId: string
}) {
  const { data: assets = [] as TrackAsset[], isLoading } = useTrackAssets(trackId)
  const { data: currentUser } = useCurrentUser()
  const addAsset = useAddTrackAsset(trackId, projectId)
  const removeAsset = useRemoveTrackAsset(trackId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Check if current user is main artist
  const supabase = createClient()
  const { data: myCollab } = useQuery({
    queryKey: ['my-collab', projectId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null
      const { data } = await supabase
        .from('collaborators')
        .select('is_main_artist')
        .eq('project_id', projectId)
        .eq('user_id', currentUser.id)
        .is('removed_at', null)
        .maybeSingle()
      return data
    },
    enabled: !!currentUser?.id,
    staleTime: 60_000,
  })
  const isMainArtist = myCollab?.is_main_artist ?? false

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await addAsset.mutateAsync({ type: 'file', file })
    } finally {
      e.target.value = ''
    }
  }

  async function handleAddLink() {
    const name = linkName.trim()
    const url = linkUrl.trim()
    if (!name || !url) return
    try {
      await addAsset.mutateAsync({ type: 'link', name, url })
      setLinkName('')
      setLinkUrl('')
      setShowLinkForm(false)
    } catch {}
  }

  async function handleRemove(asset: TrackAsset) {
    setRemovingId(asset.id)
    try {
      await removeAsset.mutateAsync(asset.id)
    } finally {
      setRemovingId(null)
    }
  }

  function canRemove(asset: TrackAsset) {
    if (!currentUser) return false
    return isMainArtist || asset.uploader_id === currentUser.id
  }

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={addAsset.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
        >
          {addAsset.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Upload size={12} />
          }
          Upload file
        </button>

        <button
          onClick={() => { setShowLinkForm(v => !v); setLinkName(''); setLinkUrl('') }}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors',
            showLinkForm
              ? 'border-primary/50 bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <Link size={12} />
          Add link
        </button>
      </div>

      {/* Inline link form */}
      {showLinkForm && (
        <div className="p-3 rounded-lg border border-border bg-accent/30 space-y-2">
          <input
            autoFocus
            type="text"
            placeholder="Name (e.g. Spotify Pre-Save)"
            value={linkName}
            onChange={e => setLinkName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }}
            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddLink}
              disabled={!linkName.trim() || !linkUrl.trim() || addAsset.isPending}
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {addAsset.isPending ? 'Adding…' : 'Add link'}
            </button>
            <button
              onClick={() => setShowLinkForm(false)}
              className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Asset list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
          <Paperclip size={24} strokeWidth={1.5} />
          <p className="text-xs">No assets yet — upload a file or add a link</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset: TrackAsset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              canRemove={canRemove(asset)}
              onRemove={() => handleRemove(asset)}
              isRemoving={removingId === asset.id}
            />
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
