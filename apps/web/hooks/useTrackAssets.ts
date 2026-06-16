'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface TrackAsset {
  id: string
  track_id: string
  project_id: string
  asset_type: 'file' | 'link'
  name: string
  storage_path: string | null
  external_url: string | null
  file_size: number | null
  mime_type: string | null
  uploader_id: string
  uploader_name: string | null
  created_at: string
}

export function useTrackAssets(trackId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track-assets', trackId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('track_assets')
        .select(`
          id, track_id, project_id, asset_type, name,
          storage_path, external_url, file_size, mime_type,
          uploader_id, created_at,
          uploader:profiles!uploader_id(full_name, display_name)
        `)
        .eq('track_id', trackId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error

      return (data ?? []).map((a: Record<string, unknown>) => {
        const p = a.uploader as { full_name: string | null; display_name: string | null } | null
        return {
          id: a.id,
          track_id: a.track_id,
          project_id: a.project_id,
          asset_type: a.asset_type,
          name: a.name,
          storage_path: a.storage_path ?? null,
          external_url: a.external_url ?? null,
          file_size: a.file_size ?? null,
          mime_type: a.mime_type ?? null,
          uploader_id: a.uploader_id,
          uploader_name: p?.full_name ?? p?.display_name ?? null,
          created_at: a.created_at,
        } as TrackAsset
      })
    },
    enabled: !!trackId,
    staleTime: 15_000,
  })
}

export function useAddTrackAsset(trackId: string, projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      input:
        | { type: 'link'; name: string; url: string }
        | { type: 'file'; file: File },
    ) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (input.type === 'link') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('track_assets').insert({
          track_id: trackId,
          project_id: projectId,
          asset_type: 'link',
          name: input.name.trim(),
          external_url: input.url.trim(),
          uploader_id: user.id,
        })
        if (error) throw error
      } else {
        const ext = input.file.name.split('.').pop() ?? 'bin'
        const assetId = crypto.randomUUID()
        const storagePath = `${projectId}/${trackId}/${assetId}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('track-assets')
          .upload(storagePath, input.file, { upsert: false })
        if (uploadErr) throw uploadErr

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertErr } = await (supabase as any).from('track_assets').insert({
          track_id: trackId,
          project_id: projectId,
          asset_type: 'file',
          name: input.file.name,
          storage_path: storagePath,
          file_size: input.file.size,
          mime_type: input.file.type || null,
          uploader_id: user.id,
        })
        if (insertErr) {
          await supabase.storage.from('track-assets').remove([storagePath])
          throw insertErr
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track-assets', trackId] }),
  })
}

export function useRemoveTrackAsset(trackId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assetId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('track_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', assetId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['track-assets', trackId] }),
  })
}

export function useDownloadAsset() {
  const supabase = createClient()
  return useMutation({
    mutationFn: async ({ storagePath, filename }: { storagePath: string; filename: string }) => {
      const { data, error } = await supabase.storage
        .from('track-assets')
        .createSignedUrl(storagePath, 300, { download: filename })
      if (error) throw error
      const a = document.createElement('a')
      a.href = data.signedUrl
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
  })
}
