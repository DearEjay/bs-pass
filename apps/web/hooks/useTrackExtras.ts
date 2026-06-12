'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type TrackCredit = Database['public']['Tables']['track_credits']['Row']

// ── Lyrics ────────────────────────────────────────────────────────────────────

export function useSaveLyrics(trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lyrics: string) => {
      const { error } = await supabase
        .from('tracks')
        .update({ lyrics })
        .eq('id', trackId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks', projectId] }),
  })
}

// ── Credits ───────────────────────────────────────────────────────────────────

export function useTrackCredits(trackId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track_credits', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_credits')
        .select('*')
        .eq('track_id', trackId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as TrackCredit[]
    },
    enabled: !!trackId,
  })
}

export function useUpsertCredit(trackId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, role, sort_order }: { id?: string; name: string; role: string; sort_order?: number }) => {
      if (id) {
        const { error } = await supabase.from('track_credits').update({ name, role }).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('track_credits').insert({ track_id: trackId, name, role, sort_order: sort_order ?? 0 })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track_credits', trackId] }),
  })
}

export function useDeleteCredit(trackId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (creditId: string) => {
      const { error } = await supabase.from('track_credits').delete().eq('id', creditId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track_credits', trackId] }),
  })
}

// ── Metadata (BPM, key, release_date, track_cover_url) ────────────────────────

interface TrackMetadata {
  bpm?: number | null
  isrc?: string | null
  key?: string | null
  language?: string | null
  release_date?: string | null
  track_cover_url?: string | null
  title?: string
  record_label?: string | null
}

export function useSaveTrackMetadata(trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: TrackMetadata) => {
      const { error } = await supabase.from('tracks').update(updates).eq('id', trackId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks', projectId] }),
  })
}
