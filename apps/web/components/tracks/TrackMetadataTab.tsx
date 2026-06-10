'use client'

import { useState } from 'react'
import { useSaveTrackMetadata } from '@/hooks/useTrackExtras'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

const COMMON_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
]

export function TrackMetadataTab({ track, projectId }: { track: Track; projectId: string }) {
  const saveMetadata = useSaveTrackMetadata(track.id, projectId)
  const supabase = createClient()

  const [bpm, setBpm] = useState(track.bpm?.toString() ?? '')
  const [key, setKey] = useState(track.key ?? '')
  const [releaseDate, setReleaseDate] = useState(
    (track as Track & { release_date?: string | null }).release_date ?? ''
  )
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverUrl, setCoverUrl] = useState(
    (track as Track & { track_cover_url?: string | null }).track_cover_url ?? null
  )

  async function handleBpmBlur() {
    const parsed = parseInt(bpm)
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : null
    if (value !== track.bpm) await saveMetadata.mutateAsync({ bpm: value })
  }

  async function handleKeyChange(value: string) {
    setKey(value)
    await saveMetadata.mutateAsync({ key: value || null })
  }

  async function handleReleaseDateBlur() {
    const value = releaseDate || null
    if (value !== ((track as Track & { release_date?: string | null }).release_date ?? null)) {
      await saveMetadata.mutateAsync({ release_date: value })
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `tracks/${track.id}/cover.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('covers')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      setCoverUrl(publicUrl)
      await saveMetadata.mutateAsync({ track_cover_url: publicUrl })
    } finally {
      setCoverUploading(false)
      e.target.value = ''
    }
  }

  async function removeCover() {
    setCoverUrl(null)
    await saveMetadata.mutateAsync({ track_cover_url: null })
  }

  return (
    <div className="px-3 pb-4 pt-3 space-y-4">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Metadata</span>

      <div className="grid grid-cols-2 gap-4">
        {/* BPM */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">BPM</label>
          <input
            type="number"
            min={1}
            max={300}
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            onBlur={handleBpmBlur}
            placeholder="120"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Key */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Key</label>
          <select
            value={key}
            onChange={e => handleKeyChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select key</option>
            {COMMON_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Release date */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Release date</label>
          <input
            type="date"
            value={releaseDate}
            onChange={e => setReleaseDate(e.target.value)}
            onBlur={handleReleaseDateBlur}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Track cover art */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Cover art</label>
          {coverUrl ? (
            <div className="relative w-20 h-20">
              <img src={coverUrl} alt="Track cover" className="w-full h-full object-cover rounded-md" />
              <button
                onClick={removeCover}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors">
              <Upload size={13} />
              {coverUploading ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverUpload}
                disabled={coverUploading}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
