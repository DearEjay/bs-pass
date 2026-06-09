'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row']

export type ChatMessage = ChatMessageRow & {
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

export function useMessages(projectId: string) {
  const supabase = createClient()
  return useQuery({
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
    refetchInterval: 3000,
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
