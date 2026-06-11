'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
    enabled: !!userId,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { qc.invalidateQueries({ queryKey: ['notifications', userId] }) },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase, qc])

  return query
}

export function useMarkNotificationRead(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      if (error) throw error
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<Notification[]>(['notifications', userId], old =>
        old?.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n) ?? []
      )
    },
  })
}

export function useMarkAllNotificationsRead(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
      if (error) throw error
    },
    onSuccess: () => {
      qc.setQueryData<Notification[]>(['notifications', userId], old =>
        old?.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? []
      )
    },
  })
}
