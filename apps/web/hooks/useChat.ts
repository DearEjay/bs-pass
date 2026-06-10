'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row']

export type ChatMessage = ChatMessageRow & {
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

export type Collaborator = {
  user_id: string
  is_main_artist: boolean
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

export function useMessages(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['chat', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, profiles:sender_id(display_name, avatar_url)')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as ChatMessage[]
    },
    staleTime: Infinity, // realtime keeps it fresh
  })

  useEffect(() => {
    const channel = supabase
      .channel(`chat-messages-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const newId = (payload.new as { id: string }).id
          // Fetch with the profile join so the message shape is complete
          const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles:sender_id(display_name, avatar_url)')
            .eq('id', newId)
            .single()
          if (!data) return
          qc.setQueryData<ChatMessage[]>(['chat', projectId], old => {
            const existing = old ?? []
            if (existing.some(m => m.id === newId)) return existing
            return [...existing, data as ChatMessage]
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, supabase, qc])

  return query
}

export function useSendMessage(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ body, senderId }: { body: string; senderId: string }) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ project_id: projectId, sender_id: senderId, body, sender_type: 'user' })
        .select('*, profiles:sender_id(display_name, avatar_url)')
        .single()
      if (error) throw error
      return data as ChatMessage
    },
    onSuccess: newMessage => {
      qc.setQueryData<ChatMessage[]>(['chat', projectId], old => [...(old ?? []), newMessage])
    },
  })
}

export function useProjectCollaborators(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['chat-collaborators', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('user_id, is_main_artist, profiles:user_id(display_name, avatar_url)')
        .eq('project_id', projectId)
        .is('removed_at', null)
      if (error) throw error
      return data as Collaborator[]
    },
  })
}

export function useTypingPresence(projectId: string, currentUserId: string, displayName: string) {
  const supabase = createClient()
  const [typers, setTypers] = useState<Record<string, { name: string; ts: number }>>({})
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastSentRef = useRef<number>(0)

  useEffect(() => {
    const channel = supabase
      .channel(`chat-typing-${projectId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: { userId: string; name: string } }) => {
        if (payload.userId === currentUserId) return
        setTypers(prev => ({ ...prev, [payload.userId]: { name: payload.name, ts: Date.now() } }))
      })
      .subscribe()

    channelRef.current = channel

    const interval = setInterval(() => {
      const now = Date.now()
      setTypers(prev => {
        const stale = Object.keys(prev).filter(k => now - prev[k].ts > 3000)
        if (stale.length === 0) return prev
        const next = { ...prev }
        stale.forEach(k => delete next[k])
        return next
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [projectId, currentUserId])

  function broadcastTyping() {
    const now = Date.now()
    if (now - lastSentRef.current < 2000) return
    lastSentRef.current = now
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, name: displayName },
    })
  }

  const typerNames = Object.values(typers).map(t => t.name)
  return { typerNames, broadcastTyping }
}
