import { Bot } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat'

export function ChatMessage({
  message,
  isOwnMessage,
  isFirst = true,
  isLast = true,
}: {
  message: ChatMessageType
  isOwnMessage: boolean
  isFirst?: boolean
  isLast?: boolean
}) {
  const isAgent = message.sender_type === 'agent'
  const senderName = isAgent ? 'BS-PASS AI' : (message.profiles?.display_name ?? 'Unknown')
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : ''
  const initial = (message.profiles?.display_name?.[0] ?? '?').toUpperCase()

  // Spacing: tighter within a group, more space between groups
  const marginTop = isFirst ? 'mt-4' : 'mt-0.5'

  if (isOwnMessage) {
    return (
      <div className={cn('flex justify-end items-end gap-2', marginTop)}>
        <div className="flex flex-col items-end max-w-[72%]">
          {isLast && (
            <span className="text-[11px] text-muted-foreground mb-1 mr-1">{time}</span>
          )}
          <div className={cn(
            'bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isFirst && isLast  ? 'rounded-2xl rounded-tr-sm' :
            isFirst            ? 'rounded-2xl rounded-tr-sm rounded-br-md' :
            isLast             ? 'rounded-2xl rounded-tr-md rounded-br-sm' :
                                 'rounded-2xl rounded-r-md',
          )}>
            {message.body}
          </div>
        </div>
      </div>
    )
  }

  if (isAgent) {
    return (
      <div className={cn('flex gap-2.5 items-end', marginTop)}>
        <div className="w-8 shrink-0">
          {isLast && (
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot size={14} className="text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 max-w-[72%]">
          {isFirst && (
            <span className="text-xs font-medium text-primary block mb-1 ml-1">{senderName}</span>
          )}
          <div className={cn(
            'bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words inline-block max-w-full',
            isFirst && isLast  ? 'rounded-2xl rounded-tl-sm' :
            isFirst            ? 'rounded-2xl rounded-tl-sm rounded-bl-md' :
            isLast             ? 'rounded-2xl rounded-tl-md rounded-bl-sm' :
                                 'rounded-2xl rounded-l-md',
          )}>
            {message.body}
          </div>
          {isLast && (
            <span className="text-[11px] text-muted-foreground mt-1 ml-1 block">{time}</span>
          )}
        </div>
      </div>
    )
  }

  // Other collaborator
  return (
    <div className={cn('flex gap-2.5 items-end', marginTop)}>
      <div className="w-8 shrink-0">
        {isLast && (
          <div className="w-8 h-8 rounded-full bg-accent border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
            {initial}
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-[72%]">
        {isFirst && (
          <span className="text-xs font-medium block mb-1 ml-1">{senderName}</span>
        )}
        <div className={cn(
          'bg-card border border-border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words inline-block max-w-full',
          isFirst && isLast  ? 'rounded-2xl rounded-tl-sm' :
          isFirst            ? 'rounded-2xl rounded-tl-sm rounded-bl-md' :
          isLast             ? 'rounded-2xl rounded-tl-md rounded-bl-sm' :
                               'rounded-2xl rounded-l-md',
        )}>
          {message.body}
        </div>
        {isLast && (
          <span className="text-[11px] text-muted-foreground mt-1 ml-1 block">{time}</span>
        )}
      </div>
    </div>
  )
}
