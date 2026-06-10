'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row']

export interface ChatReaction {
  id: string
  user_id: string
  emoji: string
}

export type ChatMessage = ChatMessageRow & {
  profiles: { display_name: string | null; avatar_url: string | null } | null
  reactions: ChatReaction[]
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
        .select('*, profiles:sender_id(display_name, avatar_url), reactions:chat_reactions(id, user_id, emoji)')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(m => ({ ...m, reactions: (m.reactions as ChatReaction[]) ?? [] })) as ChatMessage[]
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    // New messages
    const msgChannel = supabase
      .channel(`chat-messages-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const newId = (payload.new as { id: string }).id
          const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles:sender_id(display_name, avatar_url), reactions:chat_reactions(id, user_id, emoji)')
            .eq('id', newId)
            .single()
          if (!data) return
          qc.setQueryData<ChatMessage[]>(['chat', projectId], old => {
            const existing = old ?? []
            if (existing.some(m => m.id === newId)) return existing
            return [...existing, { ...data, reactions: (data.reactions as ChatReaction[]) ?? [] } as ChatMessage]
          })
        },
      )
      .subscribe()

    // Reaction changes
    const rxnChannel = supabase
      .channel(`chat-reactions-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reactions' },
        async (payload) => {
          const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
          const messageId = (raw as { message_id: string }).message_id
          if (!messageId) return
          const cached = qc.getQueryData<ChatMessage[]>(['chat', projectId])
          if (!cached?.some(m => m.id === messageId)) return
          const { data: reactions } = await supabase
            .from('chat_reactions')
            .select('id, user_id, emoji')
            .eq('message_id', messageId)
          qc.setQueryData<ChatMessage[]>(['chat', projectId], old =>
            old?.map(m => m.id === messageId ? { ...m, reactions: (reactions ?? []) as ChatReaction[] } : m)
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(rxnChannel)
    }
  }, [projectId, supabase, qc])

  return query
}

export function useToggleReaction(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ messageId, emoji, userId }: { messageId: string; emoji: string; userId: string }) => {
      const { data: existing } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase.from('chat_reactions').delete().eq('id', existing.id)
        if (error) throw error
        return 'removed'
      } else {
        const { error } = await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: userId, emoji })
        if (error) throw error
        return 'added'
      }
    },
    onMutate: async ({ messageId, emoji, userId }) => {
      const prev = qc.getQueryData<ChatMessage[]>(['chat', projectId])
      qc.setQueryData<ChatMessage[]>(['chat', projectId], old =>
        old?.map(m => {
          if (m.id !== messageId) return m
          const existing = m.reactions.find(r => r.emoji === emoji && r.user_id === userId)
          if (existing) {
            return { ...m, reactions: m.reactions.filter(r => !(r.emoji === emoji && r.user_id === userId)) }
          }
          return { ...m, reactions: [...m.reactions, { id: `opt-${Date.now()}`, user_id: userId, emoji }] }
        })
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['chat', projectId], ctx.prev)
    },
  })
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
