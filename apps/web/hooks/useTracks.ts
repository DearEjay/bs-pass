import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { computeProjectStatus } from '@/lib/project-status'
import { trackEvent } from './useTrackEvent'
import { compressAudioIfNeeded } from '@/lib/compress-audio'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Split = Database['public']['Tables']['splits']['Row']
type NewTrack = Pick<
  Database['public']['Tables']['tracks']['Insert'],
  'title' | 'bpm' | 'key' | 'project_id'
>

export const TRACK_STATUSES = [
  'writing',
  'recording',
  'mixing',
  'mastering',
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

// Fetch splits from DB, compute new project status, update cache + DB.
// Cache is updated synchronously first so the UI reacts immediately.
async function syncProjectStatus(
  projectId: string,
  supabase: ReturnType<typeof createClient>,
  qc: ReturnType<typeof useQueryClient>,
  tracks: Track[],
) {
  // Must read splits from DB — they're cached per-track not per-project
  const { data: splits = [] } = await supabase
    .from('splits')
    .select('signed_at, track_id, tracks!inner(project_id)')
    .eq('tracks.project_id', projectId)

  const newStatus = computeProjectStatus(tracks, splits as { signed_at: string | null }[])

  // Update cache immediately for instant UI
  qc.setQueryData<Project>(['project', projectId], old =>
    old ? { ...old, status: newStatus } : old
  )

  // Persist to DB (awaited so navigation doesn't drop the write)
  await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
}

export function useProjectStatus(projectId: string, initialProject: Project) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects').select('*').eq('id', projectId).single()
      if (error) throw error
      return data as Project
    },
    initialData: initialProject,
    staleTime: Infinity, // mutations keep this fresh via setQueryData
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
      const ALLOWED_AUDIO = ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/aiff','audio/x-aiff','audio/flac','audio/ogg','audio/mp4','audio/m4a','audio/aac']
      if (!ALLOWED_AUDIO.includes(file.type) && !file.name.match(/\.(mp3|wav|aiff|flac|ogg|m4a|aac)$/i)) {
        throw new Error('Only audio files are supported (MP3, WAV, AIFF, FLAC, OGG, M4A, AAC)')
      }
      if (file.size > 500 * 1024 * 1024) throw new Error('File too large — maximum 500 MB per track')

      // Compress WAV → FLAC (lossless, ~50% smaller). Other formats pass through.
      const uploadFile = await compressAudioIfNeeded(file)

      // 1. Create the track row first to get an ID
      const { data: track, error: trackErr } = await supabase
        .from('tracks')
        .insert({ title, bpm: bpm ?? null, key: key ?? null, project_id: projectId })
        .select()
        .single()
      if (trackErr) throw trackErr

      // 2. Upload file: tracks/{projectId}/{trackId}/{filename}
      const ext = uploadFile.name.split('.').pop()
      const storagePath = `${projectId}/${track.id}/original.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('tracks')
        .upload(storagePath, uploadFile, { upsert: false, contentType: uploadFile.type })
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
    onSuccess: async (newTrack) => {
      qc.setQueryData<Track[]>(['tracks', projectId], old => [...(old ?? []), newTrack])
      const tracks = qc.getQueryData<Track[]>(['tracks', projectId]) ?? []
      await syncProjectStatus(projectId, supabase, qc, tracks)
      trackEvent('track_created', { project_id: projectId, track_id: newTrack.id })
    },
  })
}

export function useUpdateTrackTitle(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trackId, title }: { trackId: string; title: string }) => {
      const { data, error } = await supabase
        .from('tracks')
        .update({ title })
        .eq('id', trackId)
        .select()
        .single()
      if (error) throw error
      return data as Track
    },
    onSuccess: (updated) => {
      qc.setQueryData<Track[]>(['tracks', projectId], old =>
        old?.map(t => (t.id === updated.id ? updated : t)) ?? []
      )
    },
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
      qc.setQueryData<Track[]>(['tracks', projectId], old =>
        old?.map(t => (t.id === updatedTrack.id ? updatedTrack : t)) ?? []
      )
      const tracks = qc.getQueryData<Track[]>(['tracks', projectId]) ?? []
      await syncProjectStatus(projectId, supabase, qc, tracks)
      trackEvent('track_status_changed', { project_id: projectId, track_id: updatedTrack.id, status: updatedTrack.current_status })
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
    onSuccess: async (_, trackId) => {
      qc.setQueryData<Track[]>(['tracks', projectId], old =>
        old?.filter(t => t.id !== trackId) ?? []
      )
      const tracks = qc.getQueryData<Track[]>(['tracks', projectId]) ?? []
      await syncProjectStatus(projectId, supabase, qc, tracks)
    },
  })
}

export function useRestoreDeletedTrack(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase.from('tracks').update({ deleted_at: null }).eq('id', trackId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracks', projectId] })
    },
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
      if (file.size > 500 * 1024 * 1024) throw new Error('File too large — maximum 500 MB per track')

      // Fetch next version number first — the network round-trip lets React
      // flush isPending=true so the spinner is visible before compression starts.
      const { data: existing } = await supabase
        .from('track_versions')
        .select('version_number')
        .eq('track_id', trackId)
        .order('version_number', { ascending: false })
        .limit(1)
      const nextNum = ((existing?.[0]?.version_number) ?? 0) + 1

      // Compress WAV → FLAC (lossless). Other formats pass through.
      const uploadFile = await compressAudioIfNeeded(file)

      // Upload file
      const ext = uploadFile.name.split('.').pop()
      const storagePath = `${projectId}/${trackId}/v${nextNum}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('tracks')
        .upload(storagePath, uploadFile, { upsert: false, contentType: uploadFile.type })
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

export function useVersionAudioUrl(filePath: string | null | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['version-audio-url', filePath],
    queryFn: async () => {
      if (!filePath) return null
      const { data, error } = await supabase.storage.from('tracks').createSignedUrl(filePath, 3600)
      if (error) throw error
      return data.signedUrl
    },
    enabled: !!filePath,
    staleTime: 50 * 60 * 1000,
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
