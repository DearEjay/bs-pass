'use client'

import { useState, useRef } from 'react'
import {
  useProjectAssets,
  useAddProjectAsset,
  useRemoveProjectAsset,
  useDownloadAsset,
  type ProjectAsset,
} from '@/hooks/useProjectAssets'
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
  asset: ProjectAsset
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
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:border-border/80 transition-colors">
      <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center shrink-0">
        {isFile
          ? <FileIcon mimeType={asset.mime_type} className="text-muted-foreground" />
          : <Link size={15} className="text-muted-foreground" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{asset.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {asset.uploader_name ?? 'Unknown'}
          <span className="mx-1 opacity-40">·</span>
          {formatDate(asset.created_at)}
          {asset.file_size != null && (
            <><span className="mx-1 opacity-40">·</span>{formatBytes(asset.file_size)}</>
          )}
          {!isFile && asset.external_url && (
            <><span className="mx-1 opacity-40">·</span>
            <span className="text-primary/70">{asset.external_url}</span></>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleAction}
          disabled={downloadAsset.isPending}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={isFile ? 'Download' : 'Open link'}
        >
          {downloadAsset.isPending
            ? <Loader2 size={13} className="animate-spin" />
            : isFile ? <Download size={13} /> : <ExternalLink size={13} />
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

export function ProjectAssetsView({ projectId }: { projectId: string }) {
  const { data: assets = [] as ProjectAsset[], isLoading } = useProjectAssets(projectId)
  const { data: currentUser } = useCurrentUser()
  const addAsset = useAddProjectAsset(projectId)
  const removeAsset = useRemoveProjectAsset(projectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

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
    addAsset.reset()
    try { await addAsset.mutateAsync({ type: 'file', file }) }
    catch { /* error visible via addAsset.error */ }
    finally { e.target.value = '' }
  }

  async function handleAddLink() {
    const name = linkName.trim()
    const url = linkUrl.trim()
    if (!name || !url) return
    addAsset.reset()
    try {
      await addAsset.mutateAsync({ type: 'link', name, url })
      setLinkName('')
      setLinkUrl('')
      setShowLinkForm(false)
    } catch { /* error visible via addAsset.error */ }
  }

  async function handleRemove(asset: ProjectAsset) {
    setRemovingId(asset.id)
    try { await removeAsset.mutateAsync(asset.id) }
    finally { setRemovingId(null) }
  }

  function canRemove(asset: ProjectAsset) {
    if (!currentUser) return false
    return isMainArtist || asset.uploader_id === currentUser.id
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Assets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Files and links shared with the project</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={addAsset.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            {addAsset.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Upload file
          </button>
          <button
            onClick={() => { setShowLinkForm(v => !v); setLinkName(''); setLinkUrl('') }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors',
              showLinkForm
                ? 'border-primary/50 bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Link size={13} />
            Add link
          </button>
        </div>
      </div>

      {/* Upload / link error */}
      {addAsset.isError && (
        <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {(addAsset.error as Error)?.message ?? 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* Inline link form */}
      {showLinkForm && (
        <div className="p-4 rounded-lg border border-border bg-accent/30 space-y-2.5">
          <input
            autoFocus
            type="text"
            placeholder="Name (e.g. Spotify Pre-Save)"
            value={linkName}
            onChange={e => setLinkName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="url"
            placeholder="https://…"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }}
            className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddLink}
              disabled={!linkName.trim() || !linkUrl.trim() || addAsset.isPending}
              className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {addAsset.isPending ? 'Adding…' : 'Add link'}
            </button>
            <button
              onClick={() => setShowLinkForm(false)}
              className="px-4 py-1.5 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Asset list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Paperclip size={32} strokeWidth={1.5} />
          <p className="text-sm">No assets yet</p>
          <p className="text-xs opacity-60">Upload a file or add a link to share with the project</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(assets as ProjectAsset[]).map((asset: ProjectAsset) => (
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

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
    </div>
  )
}
