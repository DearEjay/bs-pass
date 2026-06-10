import { Bot } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat'

function highlightSearch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// Renders body text, highlighting @[Name] mentions and bare @word mentions
function renderBody(body: string, searchQuery?: string): React.ReactNode {
  // Split on @[Name] or @word patterns
  const parts = body.split(/(@\[[^\]]+\]|@[\w]+)/g)
  return parts.map((part, i) => {
    if (/^@\[([^\]]+)\]$/.test(part)) {
      // @[Display Name] → render as @Display Name bold
      const name = part.slice(2, -1)
      return <span key={i} className="text-primary font-semibold">@{name}</span>
    }
    if (/^@[\w]+$/.test(part)) {
      // bare @word (legacy or @here/@manager)
      return <span key={i} className="text-primary font-semibold">{part}</span>
    }
    return <span key={i}>{searchQuery ? highlightSearch(part, searchQuery) : part}</span>
  })
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initial = (name?.[0] ?? '?').toUpperCase()
  const cls = `w-${size} h-${size} rounded-full overflow-hidden bg-accent border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0`
  return (
    <div className={cls}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : initial
      }
    </div>
  )
}

export function ChatMessage({
  message,
  isOwnMessage,
  isFirst = true,
  isLast = true,
  searchQuery = '',
}: {
  message: ChatMessageType
  isOwnMessage: boolean
  isFirst?: boolean
  isLast?: boolean
  searchQuery?: string
}) {
  const isAgent = message.sender_type === 'agent'
  const senderName = isAgent ? 'BS-PASS AI' : (message.profiles?.display_name ?? 'Unknown')
  const avatarUrl = message.profiles?.avatar_url
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : ''
  const marginTop = isFirst ? 'mt-5' : 'mt-0.5'

  const body = renderBody(message.body ?? '', searchQuery)

  // ── Own message (right-aligned) ──────────────────────────────────────────
  if (isOwnMessage) {
    return (
      <div className={cn('flex items-start justify-end gap-2.5', marginTop)}>
        <div className="flex flex-col items-end max-w-[72%]">
          {isFirst && (
            <div className="flex items-baseline gap-2 mb-1 justify-end">
              <span className="text-[11px] text-muted-foreground">{time}</span>
              <span className="text-xs font-semibold">You</span>
            </div>
          )}
          <div className={cn(
            'bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isFirst && isLast  ? 'rounded-2xl rounded-tr-sm' :
            isFirst            ? 'rounded-2xl rounded-tr-sm rounded-br-md' :
            isLast             ? 'rounded-2xl rounded-tr-md rounded-br-sm' :
                                 'rounded-2xl rounded-r-md',
          )}>
            {body}
          </div>
        </div>
        {/* Avatar column — always reserves space, shows avatar on first message */}
        <div className="w-8 shrink-0 mt-0.5">
          {isFirst && (
            <Avatar name={senderName} avatarUrl={avatarUrl} />
          )}
        </div>
      </div>
    )
  }

  // ── AI Agent (left-aligned) ──────────────────────────────────────────────
  if (isAgent) {
    return (
      <div className={cn('flex items-start gap-2.5', marginTop)}>
        <div className="w-8 shrink-0 mt-0.5">
          {isFirst && (
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot size={14} className="text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 max-w-[72%]">
          {isFirst && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-semibold text-primary">{senderName}</span>
              <span className="text-[11px] text-muted-foreground">{time}</span>
            </div>
          )}
          <div className={cn(
            'bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words inline-block max-w-full',
            isFirst && isLast  ? 'rounded-2xl rounded-tl-sm' :
            isFirst            ? 'rounded-2xl rounded-tl-sm rounded-bl-md' :
            isLast             ? 'rounded-2xl rounded-tl-md rounded-bl-sm' :
                                 'rounded-2xl rounded-l-md',
          )}>
            {body}
          </div>
        </div>
      </div>
    )
  }

  // ── Other collaborator (left-aligned) ────────────────────────────────────
  return (
    <div className={cn('flex items-start gap-2.5', marginTop)}>
      <div className="w-8 shrink-0 mt-0.5">
        {isFirst && <Avatar name={senderName} avatarUrl={avatarUrl} />}
      </div>
      <div className="min-w-0 max-w-[72%]">
        {isFirst && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-semibold">{senderName}</span>
            <span className="text-[11px] text-muted-foreground">{time}</span>
          </div>
        )}
        <div className={cn(
          'bg-card border border-border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words inline-block max-w-full',
          isFirst && isLast  ? 'rounded-2xl rounded-tl-sm' :
          isFirst            ? 'rounded-2xl rounded-tl-sm rounded-bl-md' :
          isLast             ? 'rounded-2xl rounded-tl-md rounded-bl-sm' :
                               'rounded-2xl rounded-l-md',
        )}>
          {body}
        </div>
      </div>
    </div>
  )
}
