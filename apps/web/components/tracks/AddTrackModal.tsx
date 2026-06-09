'use client'

import { useState } from 'react'
import { useCreateTrack } from '@/hooks/useTracks'
import { X } from 'lucide-react'

export function AddTrackModal({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const createTrack = useCreateTrack(projectId)
  const [title, setTitle] = useState('')
  const [bpm, setBpm] = useState('')
  const [key, setKey] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createTrack.mutateAsync({
      title,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">Add track</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Intro, Track 1"
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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
              disabled={createTrack.isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {createTrack.isPending ? 'Adding…' : 'Add track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
