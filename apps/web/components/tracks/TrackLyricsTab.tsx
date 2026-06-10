'use client'

import { useEffect, useRef, useState } from 'react'
import { useSaveLyrics } from '@/hooks/useTrackExtras'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

export function TrackLyricsTab({ track, projectId }: { track: Track; projectId: string }) {
  const saveLyrics = useSaveLyrics(track.id, projectId)
  const [draft, setDraft] = useState(track.lyrics ?? '')
  const [saved, setSaved] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Keep draft in sync if parent refreshes track
  useEffect(() => {
    setDraft(track.lyrics ?? '')
  }, [track.lyrics])

  function triggerSave(value: string) {
    clearTimeout(saveTimerRef.current)
    setSaved(false)
    saveTimerRef.current = setTimeout(async () => {
      await saveLyrics.mutateAsync(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  return (
    <div className="px-3 pb-4 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Lyrics</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {saveLyrics.isPending && <Loader2 size={10} className="animate-spin" />}
          {saved && !saveLyrics.isPending && 'Saved'}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); triggerSave(e.target.value) }}
        onBlur={() => { clearTimeout(saveTimerRef.current); if (draft !== (track.lyrics ?? '')) saveLyrics.mutate(draft) }}
        placeholder="Paste or write lyrics here…"
        rows={12}
        className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono leading-relaxed placeholder:text-muted-foreground/60"
      />
    </div>
  )
}
