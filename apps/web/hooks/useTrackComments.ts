'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type TrackComment = {
  id: string
  track_id: string
  track_version_id: string | null
  project_id: string
  author_id: string
  body: string
  timestamp_secs: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

export function useTrackComments(trackId: string, trackVersionId: string | null) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track-comments', trackId, trackVersionId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('track_comments')
        .select('*, profiles:author_id(display_name, avatar_url)')
        .eq('track_id', trackId)
        .is('deleted_at', null)
        .order('timestamp_secs', { ascending: true })
      if (trackVersionId) {
        q = q.eq('track_version_id', trackVersionId)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as TrackComment[]
    },
    enabled: !!trackId,
  })
}

export function useCreateTrackComment(trackId: string, trackVersionId: string | null, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ body, timestamp_secs, author_id }: {
      body: string
      timestamp_secs: number
      author_id: string
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('track_comments')
        .insert({
          track_id: trackId,
          track_version_id: trackVersionId ?? null,
          project_id: projectId,
          author_id,
          body,
          timestamp_secs,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as TrackComment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track-comments', trackId, trackVersionId] }),
  })
}

export function useUpdateTrackComment(trackId: string, trackVersionId: string | null) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('track_comments')
        .update({ body })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track-comments', trackId, trackVersionId] }),
  })
}

export function useDeleteTrackComment(trackId: string, trackVersionId: string | null) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('track_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track-comments', trackId, trackVersionId] }),
  })
}
