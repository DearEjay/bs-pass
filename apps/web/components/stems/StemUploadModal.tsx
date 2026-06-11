'use client'

import { useState, useRef } from 'react'
import { useUploadStem, useUploadStemVersion } from '@/hooks/useStems'
import { X, Upload, FolderArchive } from 'lucide-react'

const ACCEPTED_MIME = ['application/zip', 'application/x-zip-compressed', 'application/x-zip']

interface NewStemProps {
  mode: 'new'
  projectId: string
  trackId: string
  trackTitle: string
  trackVersionId: string
  trackVersionLabel: string
  onClose: () => void
}

interface NewVersionProps {
  mode: 'version'
  projectId: string
  trackId: string
  stemId: string
  stemName: string
  trackVersionId: string
  trackVersionLabel: string
  onClose: () => void
}

type StemUploadModalProps = NewStemProps | NewVersionProps

function isZip(f: File) {
  return ACCEPTED_MIME.includes(f.type) || f.name.toLowerCase().endsWith('.zip')
}

export function StemUploadModal(props: StemUploadModalProps) {
  const uploadStem = useUploadStem(props.projectId, props.trackId)
  const uploadVersion = useUploadStemVersion(
    props.mode === 'version' ? props.stemId : '',
    props.trackId,
    props.projectId,
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(f: File) {
    if (!isZip(f)) { setError('Only .zip files are accepted.'); return }
    setError(null)
    setFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    try {
      const name = file.name.replace(/\.zip$/i, '')
      if (props.mode === 'new') {
        await uploadStem.mutateAsync({ file, name, trackVersionId: props.trackVersionId })
      } else {
        await uploadVersion.mutateAsync({ file, trackVersionId: props.trackVersionId ?? '' })
      }
      props.onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const isPending = uploadStem.isPending || uploadVersion.isPending
  const title = props.mode === 'new' ? 'Upload stems package' : 'Upload new stems version'
  const subtitle = props.mode === 'new'
    ? props.trackTitle
    : `${props.stemName} · ${props.trackVersionLabel}`

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-56">{subtitle}</p>
          </div>
          <button
            onClick={props.onClose}
            className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Linked to track version:{' '}
            <span className="font-medium text-foreground">{props.trackVersionLabel}</span>
          </p>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`
              relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
              ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'}
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <FolderArchive size={20} className="text-primary shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload size={24} strokeWidth={1.5} />
                <p className="text-sm">Drop stems ZIP or click to browse</p>
                <p className="text-xs">.zip only — compress your stems folder before uploading</p>
              </div>
            )}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
