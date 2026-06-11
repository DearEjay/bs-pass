'use client'

import { useState, useRef } from 'react'
import {
  useTrackStems,
  useUploadStem,
  useDeleteStem,
  useRestoreDeletedStem,
  useDownloadStemUrl,
  type Stem,
} from '@/hooks/useStems'
import { useUndoToastStore } from '@/hooks/useUndoToast'
import { StemUploadModal } from '@/components/stems/StemUploadModal'
import {
  Upload, Download, Plus, Trash2, Loader2, MoreHorizontal, FolderArchive,
} from 'lucide-react'

function formatBytes(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}


function StemPackageRow({
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
  const deleteStem = useDeleteStem(projectId, trackId)
  const restoreStem = useRestoreDeletedStem(projectId, trackId)
  const downloadStem = useDownloadStemUrl()
  const pushToast = useUndoToastStore(s => s.push)

  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showVersionUpload, setShowVersionUpload] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-3 px-3 py-3">
        <FolderArchive size={14} className="text-muted-foreground/60 shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{stem.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {stem.current_version && <span className="font-mono">v{stem.current_version.version_number}</span>}
            {formatBytes(stem.file_size_bytes) && <span>{formatBytes(stem.file_size_bytes)}</span>}
            <span className="text-muted-foreground/50">ZIP</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={() => { setShowMenu(m => !m); setConfirmDelete(false) }}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="dropdown-menu right-0 top-full mt-1 w-40">
                  <button
                    onClick={() => { downloadStem.mutate({ storagePath: stem.storage_path, filename: stem.name }); setShowMenu(false) }}
                    disabled={downloadStem.isPending}
                    className="dropdown-item disabled:opacity-50"
                  >
                    {downloadStem.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Download
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => { setShowVersionUpload(true); setShowMenu(false) }}
                        className="dropdown-item"
                      >
                        <Plus size={12} />
                        Replace
                      </button>
                      <div className="border-t border-border my-1" />
                      {!confirmDelete ? (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="dropdown-item-destructive"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      ) : (
                        <div className="px-3 py-2 space-y-1.5">
                          <p className="text-xs text-muted-foreground">Delete this package?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDelete(false)}
                              className="flex-1 py-1 text-xs border border-border rounded hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                const stemId = stem.id
                                const stemName = stem.name
                                setShowMenu(false)
                                await deleteStem.mutateAsync(stemId)
                                pushToast(`"${stemName}" deleted`, async () => {
                                  await restoreStem.mutateAsync(stemId)
                                })
                              }}
                              disabled={deleteStem.isPending}
                              className="flex-1 py-1 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/10 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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

interface TrackStemsTabProps {
  trackId: string
  projectId: string
  trackVersionId: string | null
  trackVersionLabel: string
  trackTitle: string
  canEdit: boolean
}

const ACCEPTED_ZIP = ['application/zip', 'application/x-zip-compressed', 'application/x-zip']

export function TrackStemsTab({
  trackId,
  projectId,
  trackVersionId,
  trackVersionLabel,
  trackTitle: _trackTitle,
  canEdit,
}: TrackStemsTabProps) {
  const { data: stems = [], isLoading } = useTrackStems(trackId, trackVersionId)
  const uploadStem = useUploadStem(projectId, trackId)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !trackVersionId) return
    const isZip = ACCEPTED_ZIP.includes(file.type) || file.name.toLowerCase().endsWith('.zip')
    if (!isZip) { setUploadError('Only .zip files are accepted.'); e.target.value = ''; return }
    setUploadError(null)
    try {
      await uploadStem.mutateAsync({ file, name: file.name.replace(/\.zip$/i, ''), trackVersionId })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      e.target.value = ''
    }
  }

  if (!trackVersionId) {
    return (
      <p className="px-3 py-5 text-xs text-muted-foreground">
        Upload a track version first to manage stems.
      </p>
    )
  }

  if (isLoading) {
    return <div className="px-3 py-4 h-10 bg-muted/20 animate-pulse rounded" />
  }

  const existingStem = stems[0] ?? null

  return (
    <div className="pb-2">
      {/* Header */}
      <div className="flex items-center px-3 py-2 border-b border-border/50">
        <span className="text-xs text-muted-foreground">
          Stems package for{' '}
          <span className="font-medium text-foreground font-mono">{trackVersionLabel}</span>
        </span>
      </div>

      {existingStem ? (
        <StemPackageRow
          stem={existingStem}
          projectId={projectId}
          trackId={trackId}
          trackVersionId={trackVersionId}
          trackVersionLabel={trackVersionLabel}
          canEdit={canEdit}
        />
      ) : (
        <div className="px-3 py-6 text-center">
          <FolderArchive size={24} className="mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-xs text-muted-foreground">No stems package for {trackVersionLabel}</p>
          {uploadError && <p className="text-destructive text-xs mt-1">{uploadError}</p>}
          {canEdit && (
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={uploadStem.isPending}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent transition-colors mx-auto disabled:opacity-50"
            >
              {uploadStem.isPending ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {uploadStem.isPending ? 'Uploading…' : 'Upload track stems'}
            </button>
          )}
        </div>
      )}

      <input
        ref={uploadRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
