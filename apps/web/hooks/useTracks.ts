import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']
type NewTrack = Pick<
  Database['public']['Tables']['tracks']['Insert'],
  'title' | 'bpm' | 'key' | 'project_id'
>

export const TRACK_STATUSES = [
  'draft',
  'recording',
  'recorded',
  'mixing',
  'mixed',
  'mastering',
  'mastered',
  'released',
] as const

export type TrackStatus = typeof TRACK_STATUSES[number]

export function useTracks(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['tracks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Track[]
    },
  })
}

export function useCreateTrack(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<NewTrack, 'project_id'>) => {
      const { data, error } = await supabase
        .from('tracks')
        .insert({ ...input, project_id: projectId })
        .select()
        .single()
      if (error) throw error
      return data as Track
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks', projectId] }),
  })
}

export function useUpdateTrackStatus(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trackId, status }: { trackId: string; status: TrackStatus }) => {
      const { data, error } = await supabase
        .from('tracks')
        .update({ current_status: status })
        .eq('id', trackId)
        .select()
        .single()
      if (error) throw error
      return data as Track
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracks', projectId] })
      qc.invalidateQueries({ queryKey: ['project'] })
    },
  })
}

export function useDeleteTrack(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', trackId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracks', projectId] }),
  })
}
