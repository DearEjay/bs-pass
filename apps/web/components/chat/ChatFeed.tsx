'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { MessageSquare, Search, X } from 'lucide-react'
import { useMessages, useSendMessage, useToggleReaction, useProjectCollaborators, useTypingPresence } from '@/hooks/useChat'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import type { ChatMessage as ChatMessageType } from '@/hooks/useChat'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy')
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground px-1 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function buildGroups(messages: ChatMessageType[]) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1]
    const currDate = new Date(msg.created_at!)
    const showDateSeparator = !prev || !isSameDay(new Date(prev.created_at!), currDate)
    // Always treat each message as its own group — avatar + name + time on every message
    return { message: msg, isFirst: true, isLast: true, showDateSeparator }
  })
}

export function ChatFeed({
  projectId,
  userId,
  displayName,
}: {
  projectId: string
  userId: string
  displayName: string
}) {
  const { data: messages, isLoading, error } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const toggleReaction = useToggleReaction(projectId)
  const { data: collaborators } = useProjectCollaborators(projectId)
  const { typerNames, broadcastTyping } = useTypingPresence(projectId, userId, displayName)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
    else setSearchQuery('')
  }, [searchOpen])

  useEffect(() => {
    if (searchQuery) return // don't auto-scroll while searching
    const el = scrollAreaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages?.length, searchQuery])

  const filtered = useMemo(() => {
    if (!messages) return []
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(m =>
      (m.body ?? '').toLowerCase().includes(q) ||
      (m.profiles?.display_name ?? '').toLowerCase().includes(q),
    )
  }, [messages, searchQuery])

  const groups = buildGroups(filtered)

  async function handleSend(body: string) {
    const msg = await sendMessage.mutateAsync({ body, senderId: userId })

    // If the message mentions @manager, trigger the AI chat agent
    if (/‌?@manager/i.test(body)) {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ projectId, messageId: msg.id }),
        }).catch(e => console.warn('agent-chat fetch failed:', e))
      }
    }
  }

  function handleToggleReaction(messageId: string, emoji: string) {
    toggleReaction.mutate({ messageId, emoji, userId })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      {searchOpen && (
        <div className="shrink-0 border-b border-border px-4 py-2 flex items-center gap-2 bg-background">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <span className="text-xs text-muted-foreground shrink-0">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col justify-end min-h-full px-3 sm:px-4 pt-3 sm:pt-4 pb-2 max-w-3xl mx-auto">
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

          {!isLoading && !error && filtered.length === 0 && !searchQuery && (
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

          {!isLoading && !error && filtered.length === 0 && searchQuery && (
            <p className="text-sm text-muted-foreground text-center py-12">No messages match &ldquo;{searchQuery}&rdquo;</p>
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
                    searchQuery={searchQuery}
                    currentUserId={userId}
                    onToggleReaction={handleToggleReaction}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Typing indicator */}
      <TypingIndicator names={typerNames} />

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={sendMessage.isPending}
        onTyping={broadcastTyping}
        collaborators={collaborators ?? []}
        currentUserId={userId}
        onSearchOpen={() => setSearchOpen(true)}
      />
    </div>
  )
}
