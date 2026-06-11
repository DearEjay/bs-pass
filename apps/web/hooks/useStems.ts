'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from './useTrackEvent'

// A single upload of a stems ZIP. Does NOT carry track_version_id — the parent
// Stem row owns that relationship.
export interface StemVersion {
  id: string
  version_number: number
  storage_path: string
  uploaded_by: string | null
  created_at: string | null
}

// One stems package per track version (UNIQUE(track_id, track_version_id) enforced in DB).
export interface Stem {
  id: string
  track_id: string
  track_version_id: string
  name: string
  storage_path: string
  file_size_bytes: number | null
  current_stem_version_id: string | null
  created_at: string | null
  current_version: StemVersion | null
}

export interface TrackWithStems {
  id: string
  title: string
  current_version_id: string | null
  sort_order: number
  current_version: { id: string; version_label: string; version_number: number } | null
  stems: Stem[]
}

// Project-wide view: all tracks + their stems for the current track version.
export function useProjectStems(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['project-stems', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id, title, current_version_id, sort_order,
          current_version:track_versions!current_version_id(id, version_label, version_number),
          stems!track_id(
            id, track_id, track_version_id, name, storage_path,
            file_size_bytes, current_stem_version_id, created_at, deleted_at,
            current_version:stem_versions!current_stem_version_id(
              id, version_number, storage_path, uploaded_by, created_at
            )
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
      if (error) throw error

      return (data ?? []).map(t => {
        const cv = t.current_version as { id: string; version_label: string; version_number: number } | null
        const rawStems = (t.stems ?? []) as Array<Stem & { deleted_at: string | null }>
        return {
          id: t.id,
          title: t.title,
          current_version_id: t.current_version_id ?? null,
          sort_order: t.sort_order ?? 0,
          current_version: cv,
          // Only show stems for the current track version.
          stems: rawStems
            .filter(s => !s.deleted_at && s.track_version_id === t.current_version_id)
            .map(s => ({
              id: s.id,
              track_id: s.track_id,
              track_version_id: s.track_version_id,
              name: s.name,
              storage_path: s.storage_path,
              file_size_bytes: s.file_size_bytes ?? null,
              current_stem_version_id: s.current_stem_version_id ?? null,
              created_at: s.created_at ?? null,
              current_version: s.current_version as StemVersion | null,
            } as Stem)),
        } as TrackWithStems
      })
    },
    enabled: !!projectId,
    staleTime: 15_000,
  })
}

// Per-track query used by the Stems sub-tab inside TrackItem.
// Scoped to the currently active track version — re-fetches automatically when
// trackVersionId changes (version restored / new version uploaded).
export function useTrackStems(trackId: string, trackVersionId: string | null) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track-stems', trackId, trackVersionId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('stems')
        .select(`
          id, track_id, track_version_id, name, storage_path,
          file_size_bytes, current_stem_version_id, created_at, deleted_at,
          current_version:stem_versions!current_stem_version_id(
            id, version_number, storage_path, uploaded_by, created_at
          )
        `)
        .eq('track_id', trackId)
        .is('deleted_at', null)
      if (trackVersionId) q = q.eq('track_version_id', trackVersionId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Stem[]
    },
    enabled: !!trackId,
    staleTime: 15_000,
  })
}

export function useStemVersions(stemId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['stem-versions', stemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stem_versions')
        .select('id, version_number, storage_path, uploaded_by, created_at')
        .eq('stem_id', stemId)
        .order('version_number', { ascending: false })
      if (error) throw error
      return (data ?? []) as StemVersion[]
    },
    enabled: !!stemId,
    staleTime: 15_000,
  })
}

// Creates a new stems package for a track version. DB enforces only one package
// per (track_id, track_version_id) — the UI should call useUploadStemVersion
// instead if a package already exists.
export function useUploadStem(projectId: string, trackId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file,
      name,
      trackVersionId,
    }: {
      file: File
      name: string
      trackVersionId: string
    }) => {
      const { data: stem, error: stemErr } = await supabase
        .from('stems')
        .insert({
          track_id: trackId,
          track_version_id: trackVersionId,
          name: name.trim(),
          storage_path: 'pending',
          file_size_bytes: file.size,
        })
        .select()
        .single()
      if (stemErr) throw stemErr

      const ext = file.name.split('.').pop() ?? 'zip'
      const storagePath = `${projectId}/${trackId}/${stem.id}/v1.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('stems')
        .upload(storagePath, file, { upsert: false })
      if (uploadErr) {
        await supabase.from('stems').delete().eq('id', stem.id)
        throw uploadErr
      }

      const { data: version, error: versionErr } = await supabase
        .from('stem_versions')
        .insert({ stem_id: stem.id, storage_path: storagePath, version_number: 1 })
        .select()
        .single()
      if (versionErr) throw versionErr

      const { error: updateErr } = await supabase
        .from('stems')
        .update({ current_stem_version_id: version.id, storage_path: storagePath })
        .eq('id', stem.id)
      if (updateErr) throw updateErr

      return stem
    },
    onSuccess: (_stem) => {
      qc.invalidateQueries({ queryKey: ['project-stems', projectId] })
      qc.invalidateQueries({ queryKey: ['track-stems', trackId] })
      trackEvent('stem_uploaded', { project_id: projectId, track_id: trackId })
    },
  })
}

// Adds a new version to an existing stems package (the "replace/update" path).
export function useUploadStemVersion(stemId: string, trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file }: { file: File; trackVersionId: string }) => {
      const { data: existing } = await supabase
        .from('stem_versions')
        .select('version_number')
        .eq('stem_id', stemId)
        .order('version_number', { ascending: false })
        .limit(1)
      const nextNum = ((existing?.[0]?.version_number) ?? 0) + 1

      const ext = file.name.split('.').pop() ?? 'zip'
      const storagePath = `${projectId}/${trackId}/${stemId}/v${nextNum}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('stems')
        .upload(storagePath, file, { upsert: false })
      if (uploadErr) throw uploadErr

      const { data: version, error: versionErr } = await supabase
        .from('stem_versions')
        .insert({ stem_id: stemId, storage_path: storagePath, version_number: nextNum })
        .select()
        .single()
      if (versionErr) throw versionErr

      const { error: updateErr } = await supabase
        .from('stems')
        .update({ current_stem_version_id: version.id, storage_path: storagePath })
        .eq('id', stemId)
      if (updateErr) throw updateErr

      return version as StemVersion
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-stems', projectId] })
      qc.invalidateQueries({ queryKey: ['track-stems', trackId] })
      qc.invalidateQueries({ queryKey: ['stem-versions', stemId] })
    },
  })
}

export function useRollbackStemVersion(stemId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ versionId, storagePath }: { versionId: string; storagePath: string }) => {
      const { error } = await supabase
        .from('stems')
        .update({ current_stem_version_id: versionId, storage_path: storagePath })
        .eq('id', stemId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-stems', projectId] })
      qc.invalidateQueries({ queryKey: ['stem-versions', stemId] })
    },
  })
}

export function useDownloadStemUrl() {
  const supabase = createClient()
  return useMutation({
    mutationFn: async ({ storagePath, filename }: { storagePath: string; filename: string }) => {
      const { data, error } = await supabase.storage
        .from('stems')
        .createSignedUrl(storagePath, 3600)
      if (error) throw error
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = filename.endsWith('.zip') ? filename : `${filename}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
  })
}

export function useDeleteStem(projectId: string, trackId?: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stemId: string) => {
      const { error } = await supabase
        .from('stems')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', stemId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-stems', projectId] })
      if (trackId) qc.invalidateQueries({ queryKey: ['track-stems', trackId] })
    },
  })
}

export function useRestoreDeletedStem(projectId: string, trackId?: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stemId: string) => {
      const { error } = await supabase.from('stems').update({ deleted_at: null }).eq('id', stemId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-stems', projectId] })
      if (trackId) qc.invalidateQueries({ queryKey: ['track-stems', trackId] })
    },
  })
}

export function useRenameStem(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ stemId, name }: { stemId: string; name: string }) => {
      const { error } = await supabase.from('stems').update({ name }).eq('id', stemId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-stems', projectId] })
    },
  })
}
