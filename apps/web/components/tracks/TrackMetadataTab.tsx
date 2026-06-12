'use client'

import { useState } from 'react'
import { useSaveTrackMetadata } from '@/hooks/useTrackExtras'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'
import type { Database } from '@/types/database'
import { SelectDropdown } from '@/components/ui/SelectDropdown'
import { CalendarPicker } from '@/components/ui/CalendarPicker'

type Track = Database['public']['Tables']['tracks']['Row']

const KEY_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const KEY_QUALITIES = ['Major', 'Minor']

const LANGUAGE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Mandarin', label: 'Mandarin' },
  { value: 'Cantonese', label: 'Cantonese' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Punjabi', label: 'Punjabi' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'Danish', label: 'Danish' },
  { value: 'Finnish', label: 'Finnish' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Greek', label: 'Greek' },
  { value: 'Tagalog', label: 'Tagalog' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Indonesian', label: 'Indonesian' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Swahili', label: 'Swahili' },
  { value: 'Yoruba', label: 'Yoruba' },
  { value: 'Igbo', label: 'Igbo' },
  { value: 'Amharic', label: 'Amharic' },
  { value: 'Afrikaans', label: 'Afrikaans' },
  { value: 'Instrumental', label: 'Instrumental' },
]

const KEY_NOTE_OPTIONS = [
  { value: '', label: '—' },
  ...KEY_NOTES.map(n => ({ value: n, label: n })),
]
const KEY_QUALITY_OPTIONS = KEY_QUALITIES.map(q => ({ value: q, label: q }))

function parseKey(value: string): { note: string; quality: string } {
  const parts = value.split(' ')
  if (parts.length === 2 && KEY_QUALITIES.includes(parts[1])) {
    return { note: parts[0], quality: parts[1] }
  }
  // Legacy format (e.g. "Am", "C#m")
  if (value.endsWith('m')) return { note: value.slice(0, -1), quality: 'Minor' }
  return { note: value, quality: 'Major' }
}

export function TrackMetadataTab({ track, projectId }: { track: Track; projectId: string }) {
  const saveMetadata = useSaveTrackMetadata(track.id, projectId)
  const supabase = createClient()

  const [bpm, setBpm] = useState(track.bpm?.toString() ?? '')
  const parsedKey = track.key ? parseKey(track.key) : { note: '', quality: 'Major' }
  const [keyNote, setKeyNote] = useState(parsedKey.note)
  const [keyQuality, setKeyQuality] = useState(parsedKey.quality)
  const [releaseDate, setReleaseDate] = useState(
    (track as Track & { release_date?: string | null }).release_date ?? ''
  )
  const [recordLabel, setRecordLabel] = useState(
    (track as Track & { record_label?: string | null }).record_label ?? ''
  )
  const [language, setLanguage] = useState(
    (track as Track & { language?: string | null }).language ?? ''
  )
  const [isrc, setIsrc] = useState(
    (track as Track & { isrc?: string | null }).isrc ?? ''
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

  async function handleKeyChange(note: string, quality: string) {
    const value = note ? `${note} ${quality}` : null
    await saveMetadata.mutateAsync({ key: value })
  }

  async function handleReleaseDateChange(iso: string | null) {
    setReleaseDate(iso ?? '')
    await saveMetadata.mutateAsync({ release_date: iso })
  }

  async function handleRecordLabelBlur() {
    const value = recordLabel.trim() || null
    if (value !== ((track as Track & { record_label?: string | null }).record_label ?? null)) {
      await saveMetadata.mutateAsync({ record_label: value })
    }
  }

  async function handleLanguageChange(value: string) {
    setLanguage(value)
    await saveMetadata.mutateAsync({ language: value || null })
  }

  async function handleIsrcBlur() {
    const value = isrc.trim().toUpperCase() || null
    if (value !== ((track as Track & { isrc?: string | null }).isrc ?? null)) {
      setIsrc(value ?? '')
      await saveMetadata.mutateAsync({ isrc: value })
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
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Track Details</span>

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
          <div className="flex gap-1.5">
            <SelectDropdown
              value={keyNote}
              onChange={note => { setKeyNote(note); handleKeyChange(note, keyQuality) }}
              options={KEY_NOTE_OPTIONS}
              className="flex-1"
            />
            <SelectDropdown
              value={keyQuality}
              onChange={quality => { setKeyQuality(quality); handleKeyChange(keyNote, quality) }}
              options={KEY_QUALITY_OPTIONS}
              disabled={!keyNote}
              className="flex-1"
            />
          </div>
        </div>

        {/* Release date */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Release date</label>
          <div className="w-full aspect-square">
            <CalendarPicker value={releaseDate} onChange={handleReleaseDateChange} className="h-full" />
          </div>
        </div>

        {/* Track cover art */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Cover art</label>
          {coverUrl ? (
            <div className="relative w-full aspect-square">
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <img src={coverUrl} alt="Track cover" className="w-full h-full object-cover" />
              </div>
              <button
                onClick={removeCover}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-1.5 w-full aspect-square rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 cursor-pointer transition-colors">
              <Upload size={16} />
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

      {/* Record label + Language */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Record label <span className="opacity-50">(optional)</span></label>
          <input
            type="text"
            value={recordLabel}
            onChange={e => setRecordLabel(e.target.value)}
            onBlur={handleRecordLabelBlur}
            placeholder="e.g. Independent…"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Language</label>
          <SelectDropdown
            value={language}
            onChange={handleLanguageChange}
            options={LANGUAGE_OPTIONS}
            placeholder="Select…"
          />
        </div>
      </div>

      {/* ISRC */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">ISRC</label>
        <input
          type="text"
          value={isrc}
          onChange={e => setIsrc(e.target.value)}
          onBlur={handleIsrcBlur}
          placeholder="AA-XXX-00-00000"
          maxLength={15}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-wide"
        />
      </div>
    </div>
  )
}
