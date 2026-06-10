import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { computeProjectStatus } from '@/lib/project-status'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Split = Database['public']['Tables']['splits']['Row']
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
    mutationFn: async ({ file, title, bpm, key }: {
      file: File
      title: string
      bpm?: number | null
      key?: string | null
    }) => {
      // 1. Create the track row first to get an ID
      const { data: track, error: trackErr } = await supabase
        .from('tracks')
        .insert({ title, bpm: bpm ?? null, key: key ?? null, project_id: projectId })
        .select()
        .single()
      if (trackErr) throw trackErr

      // 2. Upload file: tracks/{projectId}/{trackId}/{filename}
      const ext = file.name.split('.').pop()
      const storagePath = `${projectId}/${track.id}/original.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('tracks')
        .upload(storagePath, file, { upsert: false })
      if (uploadErr) throw uploadErr

      // 3. Create the track_version record with the file path
      const { data: version, error: versionErr } = await supabase
        .from('track_versions')
        .insert({ track_id: track.id, file_path: storagePath, version_label: 'v1', version_number: 1 })
        .select()
        .single()
      if (versionErr) throw versionErr

      // 4. Link the track to its first version
      const { data: updated, error: linkErr } = await supabase
        .from('tracks')
        .update({ current_version_id: version.id })
        .eq('id', track.id)
        .select()
        .single()
      if (linkErr) throw linkErr

      return updated as Track
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
    onSuccess: async (updatedTrack) => {
      // Apply track update to local cache immediately
      qc.setQueryData<Track[]>(['tracks', projectId], old =>
        old?.map(t => (t.id === updatedTrack.id ? updatedTrack : t)) ?? []
      )

      // Derive new project status from updated tracks + any cached splits
      const tracks = qc.getQueryData<Track[]>(['tracks', projectId]) ?? []
      const splits = qc.getQueryData<Split[]>(['splits', projectId]) ?? []
      const newStatus = computeProjectStatus(tracks, splits)

      // Persist to DB and update project cache optimistically
      await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
      qc.setQueryData<Project>(['project', projectId], old =>
        old ? { ...old, status: newStatus } : old
      )
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

export function useReorderTracks(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from('tracks').update({ sort_order: index }).eq('id', id)
        )
      )
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['tracks', projectId] })
      const previous = qc.getQueryData<Track[]>(['tracks', projectId])
      const idToTrack = new Map(previous?.map(t => [t.id, t]) ?? [])
      const reordered = orderedIds.map((id, i) => ({ ...idToTrack.get(id)!, sort_order: i }))
      qc.setQueryData(['tracks', projectId], reordered)
      return { previous }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) qc.setQueryData(['tracks', projectId], ctx.previous)
    },
  })
}

export type TrackVersion = Database['public']['Tables']['track_versions']['Row']

export function useTrackVersions(trackId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track-versions', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('track_id', trackId)
        .order('version_number', { ascending: false })
      if (error) throw error
      return data as TrackVersion[]
    },
  })
}

export function useUploadTrackVersion(trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      // Determine next version number
      const { data: existing } = await supabase
        .from('track_versions')
        .select('version_number')
        .eq('track_id', trackId)
        .order('version_number', { ascending: false })
        .limit(1)
      const nextNum = ((existing?.[0]?.version_number) ?? 0) + 1

      // Upload file
      const ext = file.name.split('.').pop()
      const storagePath = `${projectId}/${trackId}/v${nextNum}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('tracks')
        .upload(storagePath, file, { upsert: false })
      if (uploadErr) throw uploadErr

      // Create track_version row
      const { data: version, error: versionErr } = await supabase
        .from('track_versions')
        .insert({
          track_id: trackId,
          file_path: storagePath,
          version_label: `v${nextNum}`,
          version_number: nextNum,
        })
        .select()
        .single()
      if (versionErr) throw versionErr

      // Make this the active version
      const { error: trackErr } = await supabase
        .from('tracks')
        .update({ current_version_id: version.id })
        .eq('id', trackId)
      if (trackErr) throw trackErr

      return version as TrackVersion
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['track-versions', trackId] })
      qc.invalidateQueries({ queryKey: ['tracks', projectId] })
      // Bust the audio URL cache so the player reloads the new file
      qc.invalidateQueries({ queryKey: ['track-audio-url', trackId] })
    },
  })
}

export function useDeleteTrackVersion(trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ versionId, filePath, isCurrentVersion }: {
      versionId: string
      filePath: string | null
      isCurrentVersion: boolean
    }) => {
      // If deleting the active version, promote the most recent remaining one first
      if (isCurrentVersion) {
        const { data: remaining } = await supabase
          .from('track_versions')
          .select('id')
          .eq('track_id', trackId)
          .neq('id', versionId)
          .order('version_number', { ascending: false })
          .limit(1)

        const { error: linkErr } = await supabase
          .from('tracks')
          .update({ current_version_id: remaining?.[0]?.id ?? null })
          .eq('id', trackId)
        if (linkErr) throw linkErr
      }

      // Hard delete the version row
      const { error } = await supabase
        .from('track_versions')
        .delete()
        .eq('id', versionId)
      if (error) throw error

      // Delete the storage file
      if (filePath) {
        await supabase.storage.from('tracks').remove([filePath])
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['track-versions', trackId] })
      qc.invalidateQueries({ queryKey: ['tracks', projectId] })
      qc.invalidateQueries({ queryKey: ['track-audio-url', trackId] })
    },
  })
}

export function useRestoreTrackVersion(trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from('tracks')
        .update({ current_version_id: versionId })
        .eq('id', trackId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracks', projectId] })
      qc.invalidateQueries({ queryKey: ['track-audio-url', trackId] })
    },
  })
}

export function useTrackAudioUrl(track: Track | null | undefined, enabled = true) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track-audio-url', track?.id, track?.current_version_id],
    queryFn: async () => {
      if (!track?.current_version_id) return null

      const { data: version } = await supabase
        .from('track_versions')
        .select('file_path')
        .eq('id', track.current_version_id)
        .single()

      if (!version?.file_path) return null

      const { data: signed } = await supabase.storage
        .from('tracks')
        .createSignedUrl(version.file_path, 3600)

      return signed?.signedUrl ?? null
    },
    enabled: enabled && !!track?.current_version_id,
    staleTime: 50 * 60 * 1000,
  })
}
