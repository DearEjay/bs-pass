'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface Collaborator {
  id: string
  user_id: string
  is_main_artist: boolean
  roles: string[]
  status: string
  invited_at: string | null
  accepted_at: string | null
  display_name: string | null
  avatar_url: string | null
}

export interface PendingInvite {
  id: string
  email: string
  roles: string[]
  invite_token: string
  expires_at: string
  created_at: string
}

export function useCollaborators(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, user_id, is_main_artist, roles, status, invited_at, accepted_at, profiles:user_id(display_name, avatar_url)')
        .eq('project_id', projectId)
        .is('removed_at', null)
        .order('is_main_artist', { ascending: false })
      if (error) throw error
      return (data ?? []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        is_main_artist: c.is_main_artist,
        roles: Array.isArray(c.roles) ? c.roles : [],
        status: c.status ?? 'active',
        invited_at: c.invited_at ?? null,
        accepted_at: c.accepted_at ?? null,
        display_name: (c.profiles as { display_name: string | null } | null)?.display_name ?? null,
        avatar_url: (c.profiles as { avatar_url: string | null } | null)?.avatar_url ?? null,
      })) as Collaborator[]
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function usePendingInvites(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['pending_invites', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invites')
        .select('id, email, roles, invite_token, expires_at, created_at')
        .eq('project_id', projectId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PendingInvite[]
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

export function useInviteCollaborator(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, roles }: { email: string; roles: string[] }) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notifications-send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type: 'collaborator_invite', projectId, email, roles }),
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collaborators', projectId] })
      qc.invalidateQueries({ queryKey: ['pending_invites', projectId] })
    },
  })
}

export function useResendInvite(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, roles }: { email: string; roles: string[] }) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notifications-send-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type: 'collaborator_invite', projectId, email, roles }),
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collaborators', projectId] })
      qc.invalidateQueries({ queryKey: ['pending_invites', projectId] })
    },
  })
}

export function useRemoveCollaborator(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ collaboratorId, displayName }: { collaboratorId: string; displayName: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('collaborators')
        .update({ removed_at: new Date().toISOString(), status: 'removed' })
        .eq('id', collaboratorId)
      if (error) throw error

      // Fire-and-forget: agent unassigns tasks
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-process-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            event: 'collaborator.removed',
            projectId,
            entityId: collaboratorId,
            metadata: { display_name: displayName },
          }),
        }).catch(() => {})
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collaborators', projectId] })
      qc.invalidateQueries({ queryKey: ['splits'] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export function useAcceptInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const supabase = createClient()

      // Check collaborators table (registered user invite)
      const { data: collab } = await supabase
        .from('collaborators')
        .select('id,project_id')
        .eq('invite_token', token)
        .maybeSingle()

      if (collab) {
        const { error } = await supabase
          .from('collaborators')
          .update({ status: 'active', accepted_at: new Date().toISOString(), invite_token: null })
          .eq('id', collab.id)
        if (error) throw error

        // Fire agent event
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-process-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              event: 'collaborator.added',
              projectId: collab.project_id,
              entityId: collab.id,
            }),
          }).catch(() => {})
        }

        return { projectId: collab.project_id }
      }

      throw new Error('Invite not found or already accepted')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collaborators'] })
    },
  })
}

export function useCancelPendingInvite(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('pending_invites').delete().eq('id', inviteId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending_invites', projectId] })
    },
  })
}
