import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']
type NewProject = Pick<
  Database['public']['Tables']['projects']['Insert'],
  'title' | 'project_type' | 'genre' | 'timeline_start' | 'timeline_end' | 'budget_level' | 'agent_mode'
>

export function useProjects(userId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Project
    },
  })
}

export function useCreateProject(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ coverFile, ...input }: NewProject & { coverFile?: File }) => {
      // 1. Create project
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert({ ...input, owner_id: userId })
        .select()
        .single()
      if (pErr) throw pErr

      // 2. Add creator as main artist collaborator
      const { error: cErr } = await supabase
        .from('collaborators')
        .insert({
          project_id: project.id,
          user_id: userId,
          roles: ['main_artist'],
          is_main_artist: true,
          status: 'active',
        })
      if (cErr) throw cErr

      // 3. Upload cover art if provided
      if (coverFile) {
        const ext = coverFile.name.split('.').pop() ?? 'jpg'
        const path = `${project.id}/cover.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('covers')
          .upload(path, coverFile, { upsert: true, contentType: coverFile.type })
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
          await supabase.from('projects').update({ cover_url: publicUrl }).eq('id', project.id)
          project.cover_url = publicUrl
        }
      }

      return project as Project
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', userId] }),
  })
}

export function useUpdateProject(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<NewProject>) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', userId] }),
  })
}
