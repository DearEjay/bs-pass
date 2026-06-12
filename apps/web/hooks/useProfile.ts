'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type AgentPrefs = Database['public']['Tables']['user_agent_preferences']['Row']

export type NotifPrefs = {
  tasks: boolean
  chat: boolean
  signatures: boolean
  digest: 'realtime' | 'daily' | 'weekly'
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  tasks: true,
  chat: true,
  signatures: true,
  digest: 'realtime',
}

export function useProfile(userId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile(userId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: {
      display_name?: string
      full_name?: string
      pro_name?: string
      ipi_number?: string
      avatar_url?: string
    }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  })
}

export function useUploadAvatar(userId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
      if (updateError) throw updateError
      return avatarUrl
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  })
}

export function useUpdateNotifPrefs(userId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (prefs: NotifPrefs) => {
      const { error } = await supabase
        .from('profiles')
        .update({ global_notif_prefs: prefs as unknown as Database['public']['Tables']['profiles']['Update']['global_notif_prefs'] })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  })
}

export function useAgentPreferences(userId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['agent-prefs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_agent_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateAgentPreferences(userId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Omit<AgentPrefs, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      const { error } = await supabase
        .from('user_agent_preferences')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-prefs', userId] }),
  })
}

export function useResetAgentLearning(userId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_agent_preferences')
        .upsert(
          { user_id: userId, avoided_task_types: [], preferred_timeline_buffer_days: 0, learning_enabled: true },
          { onConflict: 'user_id' },
        )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-prefs', userId] }),
  })
}

export function useUpdateEmail() {
  const supabase = createClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
    },
  })
}

export function useUpdatePassword() {
  const supabase = createClient()
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}

function clearRoadmapSummaryCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('bs-pass:roadmap-summary:'))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

export function useSignOut() {
  const supabase = createClient()
  const router = useRouter()
  return useMutation({
    mutationFn: async () => {
      clearRoadmapSummaryCache()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => router.push('/login'),
  })
}

export { DEFAULT_NOTIF_PREFS }
