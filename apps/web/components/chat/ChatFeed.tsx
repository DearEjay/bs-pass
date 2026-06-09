'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useMessages, useSendMessage } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'

function DateSeparator({ date }: { date: Date }) {
  let label: string
  if (isToday(date)) label = 'Today'
  else if (isYesterday(date)) label = 'Yesterday'
  else label = format(date, 'MMMM d, yyyy')

  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground px-1">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function buildGroups(messages: ChatMessageType[]) {
  const result: Array<{
    message: ChatMessageType
    isFirst: boolean
    isLast: boolean
    showDateSeparator: boolean
  }> = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prev = messages[i - 1]
    const next = messages[i + 1]

    const prevDate = prev ? new Date(prev.created_at!) : null
    const currDate = new Date(msg.created_at!)

    const showDateSeparator = !prevDate || !isSameDay(prevDate, currDate)

    const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id && prev.sender_type === msg.sender_type && !showDateSeparator
    const sameSenderAsNext = next && next.sender_id === msg.sender_id && next.sender_type === msg.sender_type && isSameDay(currDate, new Date(next.created_at!))

    result.push({
      message: msg,
      isFirst: !sameSenderAsPrev,
      isLast: !sameSenderAsNext,
      showDateSeparator,
    })
  }
  return result
}

export function ChatFeed({ projectId, userId }: { projectId: string; userId: string }) {
  const { data: messages, isLoading, error } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages?.length])

  async function handleSend(body: string) {
    await sendMessage.mutateAsync({ body, senderId: userId })
  }

  const groups = messages ? buildGroups(messages) : []

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col justify-end min-h-full px-4 pt-6 pb-3 max-w-3xl mx-auto">

          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 !== 0 ? 'justify-end' : ''}`}>
                  {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />}
                  <div className="h-10 w-48 rounded-2xl animate-pulse bg-muted" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <p className="text-destructive text-sm text-center py-8">{(error as Error).message}</p>
          )}

          {!isLoading && !error && messages?.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare size={26} strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="text-xs mt-0.5">Start the conversation with your team.</p>
              </div>
            </div>
          )}

          {!isLoading && groups.length > 0 && (
            <div>
              {groups.map(({ message, isFirst, isLast, showDateSeparator }) => (
                <div key={message.id}>
                  {showDateSeparator && <DateSeparator date={new Date(message.created_at!)} />}
                  <ChatMessage
                    message={message}
                    isOwnMessage={message.sender_id === userId}
                    isFirst={isFirst}
                    isLast={isLast}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
    </div>
  )
}
