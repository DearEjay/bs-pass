'use client'

import { useState, useRef } from 'react'
import { useCreateTrack } from '@/hooks/useTracks'
import { X, Upload, Music, Loader2 } from 'lucide-react'

const ACCEPTED = '.mp3,.wav,.flac,.aac,.ogg,.m4a'
const ACCEPTED_MIME = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a']

function fileToTitle(filename: string) {
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim()
}

export function AddTrackModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const createTrack = useCreateTrack(projectId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [bpm, setBpm] = useState('')
  const [key, setKey] = useState('')
  const [dragOver, setDragOver] = useState(false)

  function handleFile(f: File) {
    if (!ACCEPTED_MIME.includes(f.type) && !f.name.match(/\.(mp3|wav|flac|aac|ogg)$/i)) return
    setFile(f)
    if (!title) setTitle(fileToTitle(f.name))
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
    await createTrack.mutateAsync({
      file,
      title: title || fileToTitle(file.name),
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold">Add track</h2>
          <button onClick={onClose} className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">
          {/* File drop zone */}
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
              accept={ACCEPTED}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div className="flex items-center gap-3 justify-center">
                <Music size={20} className="text-primary shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload size={24} strokeWidth={1.5} />
                <p className="text-sm">Drop an audio file or click to browse</p>
                <p className="text-xs">MP3, WAV, FLAC, AAC, OGG</p>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Track title"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* BPM + Key */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">BPM <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                value={bpm}
                onChange={e => setBpm(e.target.value)}
                placeholder="120"
                min={40}
                max={300}
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Key <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="C minor"
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {createTrack.error && (
            <p className="text-destructive text-sm">{(createTrack.error as Error).message}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || createTrack.isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {createTrack.isPending && <Loader2 size={14} className="animate-spin" />}
              {createTrack.isPending ? 'Processing…' : 'Add track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
