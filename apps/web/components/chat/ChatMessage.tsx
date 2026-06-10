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

// Renders body text, highlighting mentions and bare @word mentions.
// Handles three formats:
//   @[Name]   — legacy bracket format (already stored in DB)
//   @Name‌    — new format: ZWNJ (U+200C) marks end of mention, no visible brackets
//   @word     — bare single-word mention (@here, @manager)
function renderBody(body: string, searchQuery?: string): React.ReactNode {
  const parts = body.split(/(@\[[^\]]+\]|@[^@‌\n]+‌|@[\w]+)/g)
  return parts.map((part, i) => {
    if (/^@\[([^\]]+)\]$/.test(part)) {
      const name = part.slice(2, -1)
      return <span key={i} className="text-primary font-semibold">@{name}</span>
    }
    if (part.startsWith('@') && part.endsWith('‌')) {
      const name = part.slice(1, -1)
      return <span key={i} className="text-primary font-semibold">@{name}</span>
    }
    if (/^@[\w]+$/.test(part)) {
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
  const senderName = isAgent ? 'Manager' : (message.profiles?.display_name ?? 'Unknown')
  const avatarUrl = message.profiles?.avatar_url
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : ''
  const marginTop = isFirst ? 'mt-5' : 'mt-0.5'

  const body = renderBody(message.body ?? '', searchQuery)

  // ── Own message (right-aligned) ──────────────────────────────────────────
  if (isOwnMessage) {
    return (
      <div className={cn('flex justify-end', marginTop)}>
        <div className="flex flex-col items-end max-w-[72%]">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[11px] text-muted-foreground">{time}</span>
            <span className="text-xs font-semibold">You</span>
          </div>
          <div className="flex items-end gap-1.5">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm">
              {body}
            </div>
            <Avatar name={senderName} avatarUrl={avatarUrl} />
          </div>
        </div>
      </div>
    )
  }

  // ── AI Agent (left-aligned) ──────────────────────────────────────────────
  if (isAgent) {
    return (
      <div className={cn('flex justify-start', marginTop)}>
        <div className="flex flex-col items-start max-w-[72%]">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-semibold text-primary">{senderName}</span>
            <span className="text-[11px] text-muted-foreground">{time}</span>
          </div>
          <div className="flex items-end gap-1.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-primary" />
            </div>
            <div className="bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm inline-block">
              {body}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Other collaborator (left-aligned) ────────────────────────────────────
  return (
    <div className={cn('flex justify-start', marginTop)}>
      <div className="flex flex-col items-start max-w-[72%]">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold">{senderName}</span>
          <span className="text-[11px] text-muted-foreground">{time}</span>
        </div>
        <div className="flex items-end gap-1.5">
          <Avatar name={senderName} avatarUrl={avatarUrl} />
          <div className="bg-card border border-border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm inline-block">
            {body}
          </div>
        </div>
      </div>
    </div>
  )
}
