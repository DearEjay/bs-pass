'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useMessages, useSendMessage } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function ChatFeed({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: messages, isLoading, error } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever a new message arrives
  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages?.length])

  async function handleSend(body: string) {
    await sendMessage.mutateAsync({ body, senderId: userId })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable messages — justify-end + min-h-full pins content to bottom when sparse */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col justify-end min-h-full px-6 pt-6 pb-3 max-w-3xl mx-auto">
          {isLoading && (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 !== 0 ? 'justify-end' : ''}`}>
                  {i % 2 === 0 && <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />}
                  <div className="h-10 w-52 rounded-2xl animate-pulse bg-muted" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <p className="text-destructive text-sm text-center py-8">{(error as Error).message}</p>
          )}

          {!isLoading && !error && messages?.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <MessageSquare size={32} strokeWidth={1.5} />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}

          {!isLoading && messages && messages.length > 0 && (
            <div className="space-y-5">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} isOwnMessage={msg.sender_id === userId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input — pinned at bottom as a flex child, never floats */}
      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
    </div>
  )
}
