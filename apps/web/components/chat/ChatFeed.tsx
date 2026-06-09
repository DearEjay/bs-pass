'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useMessages, useSendMessage } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function ChatFeed({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: messages, isLoading, error } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length])

  async function handleSend(body: string) {
    await sendMessage.mutateAsync({ body, senderId: userId })
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-3xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 !== 0 ? 'justify-end' : ''}`}>
            {i % 2 === 0 && <div className="w-7 h-7 rounded-full bg-accent/40 animate-pulse shrink-0" />}
            <div className="h-10 w-52 rounded-2xl animate-pulse bg-accent/20" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="p-6 text-destructive text-sm">{(error as Error).message}</p>
  }

  return (
    <>
      <div className="px-6 pt-6 pb-2 max-w-3xl mx-auto space-y-5">
        {messages?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <MessageSquare size={32} strokeWidth={1.5} />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages?.map(msg => (
          <ChatMessage key={msg.id} message={msg} isOwnMessage={msg.sender_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
    </>
  )
}
