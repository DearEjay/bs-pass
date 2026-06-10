'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface Collaborator {
  id: string
  user_id: string
  is_main_artist: boolean
  roles: string[]
  display_name: string | null
  avatar_url: string | null
}

export function useCollaborators(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, user_id, is_main_artist, roles, profiles:user_id(display_name, avatar_url)')
        .eq('project_id', projectId)
        .is('removed_at', null)
      if (error) throw error
      return (data ?? []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        is_main_artist: c.is_main_artist,
        roles: Array.isArray(c.roles) ? c.roles : [],
        display_name: (c.profiles as { display_name: string | null } | null)?.display_name ?? null,
        avatar_url: (c.profiles as { avatar_url: string | null } | null)?.avatar_url ?? null,
      })) as Collaborator[]
    },
    enabled: !!projectId,
    staleTime: 60_000,
  })
}
