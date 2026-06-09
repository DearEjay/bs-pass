import { Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat'

export function ChatMessage({
  message,
  isOwnMessage,
}: {
  message: ChatMessageType
  isOwnMessage: boolean
}) {
  const isAgent = message.sender_type === 'agent'
  const senderName = isAgent ? 'BS-PASS AI' : (message.profiles?.display_name ?? 'Unknown')
  const time = message.created_at
    ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
    : ''
  const initial = (message.profiles?.display_name?.[0] ?? '?').toUpperCase()

  if (isAgent) {
    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-medium text-primary">{senderName}</span>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {message.body}
          </p>
        </div>
      </div>
    )
  }

  if (isOwnMessage) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="flex items-baseline justify-end gap-2 mb-1">
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-muted-foreground">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium">{senderName}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 inline-block max-w-full">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
        </div>
      </div>
    </div>
  )
}
