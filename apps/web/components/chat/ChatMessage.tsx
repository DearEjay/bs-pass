'use client'

import { useState, useMemo } from 'react'
import { Bot } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType, ChatReaction } from '@/hooks/useChat'

const TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓'] as const

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

function TapbackTray({
  reactions,
  currentUserId,
  onReact,
  align,
}: {
  reactions: ChatReaction[]
  currentUserId: string
  onReact: (emoji: string) => void
  align: 'left' | 'right'
}) {
  return (
    <div className={cn(
      'flex items-center gap-0.5 px-1.5 py-1 rounded-full bg-card border border-border shadow-xl',
      align === 'right' ? 'self-end' : 'self-start',
    )}>
      {TAPBACKS.map(emoji => {
        const mine = reactions.some(r => r.emoji === emoji && r.user_id === currentUserId)
        return (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full text-base transition-all hover:scale-110 active:scale-95',
              mine ? 'bg-primary/15' : 'hover:bg-accent',
            )}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}

function ReactionPills({
  reactions,
  currentUserId,
  onReact,
  align,
}: {
  reactions: ChatReaction[]
  currentUserId: string
  onReact: (emoji: string) => void
  align: 'left' | 'right'
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>()
    for (const r of reactions) {
      const existing = map.get(r.emoji) ?? { count: 0, mine: false }
      map.set(r.emoji, {
        count: existing.count + 1,
        mine: existing.mine || r.user_id === currentUserId,
      })
    }
    // Return in tapback order
    return TAPBACKS.flatMap(e => {
      const d = map.get(e)
      return d ? [{ emoji: e, ...d }] : []
    })
  }, [reactions, currentUserId])

  if (grouped.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1 mt-1', align === 'right' ? 'justify-end' : 'justify-start')}>
      {grouped.map(({ emoji, count, mine }) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className={cn(
            'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-colors',
            mine
              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
              : 'bg-card border-border hover:bg-accent',
          )}
        >
          <span>{emoji}</span>
          {count > 1 && <span className="tabular-nums ml-0.5">{count}</span>}
        </button>
      ))}
    </div>
  )
}

export function ChatMessage({
  message,
  isOwnMessage,
  isFirst = true,
  isLast = true,
  searchQuery = '',
  currentUserId = '',
  onToggleReaction,
}: {
  message: ChatMessageType
  isOwnMessage: boolean
  isFirst?: boolean
  isLast?: boolean
  searchQuery?: string
  currentUserId?: string
  onToggleReaction?: (messageId: string, emoji: string) => void
}) {
  const [showTray, setShowTray] = useState(false)
  const isAgent = message.sender_type === 'agent'
  const senderName = isAgent ? 'Manager' : (message.profiles?.display_name ?? 'Unknown')
  const avatarUrl = message.profiles?.avatar_url
  const time = message.created_at ? format(new Date(message.created_at), 'h:mm a') : ''
  const marginTop = isFirst ? 'mt-5' : 'mt-0.5'
  const reactions = message.reactions ?? []

  const body = renderBody(message.body ?? '', searchQuery)

  function handleReact(emoji: string) {
    if (!onToggleReaction || !currentUserId) return
    onToggleReaction(message.id, emoji)
    setShowTray(false)
  }

  // ── Own message (right-aligned) ──────────────────────────────────────────
  if (isOwnMessage) {
    return (
      <div
        className={cn('flex justify-end', marginTop)}
        onMouseEnter={() => setShowTray(true)}
        onMouseLeave={() => setShowTray(false)}
      >
        <div className="flex flex-col items-end max-w-[72%]">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[11px] text-muted-foreground">{time}</span>
            <span className="text-xs font-semibold">You</span>
          </div>
          {showTray && onToggleReaction && (
            <div className="mb-1.5">
              <TapbackTray reactions={reactions} currentUserId={currentUserId} onReact={handleReact} align="right" />
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm">
              {body}
            </div>
            <Avatar name={senderName} avatarUrl={avatarUrl} />
          </div>
          <ReactionPills reactions={reactions} currentUserId={currentUserId} onReact={handleReact} align="right" />
        </div>
      </div>
    )
  }

  // ── AI Agent (left-aligned, no reactions) ────────────────────────────────
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
    <div
      className={cn('flex justify-start', marginTop)}
      onMouseEnter={() => setShowTray(true)}
      onMouseLeave={() => setShowTray(false)}
    >
      <div className="flex flex-col items-start max-w-[72%]">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold">{senderName}</span>
          <span className="text-[11px] text-muted-foreground">{time}</span>
        </div>
        {showTray && onToggleReaction && (
          <div className="mb-1.5">
            <TapbackTray reactions={reactions} currentUserId={currentUserId} onReact={handleReact} align="left" />
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <Avatar name={senderName} avatarUrl={avatarUrl} />
          <div className="bg-card border border-border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm inline-block">
            {body}
          </div>
        </div>
        <ReactionPills reactions={reactions} currentUserId={currentUserId} onReact={handleReact} align="left" />
      </div>
    </div>
  )
}
