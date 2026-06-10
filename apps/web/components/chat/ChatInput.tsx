'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Collaborator } from '@/hooks/useChat'

type MentionOption = { name: string; display: string; subtitle: string }

const SPECIAL_MENTIONS: MentionOption[] = [
  { name: 'here',    display: '@here',    subtitle: 'Notify everyone in this project' },
  { name: 'manager', display: '@manager', subtitle: 'Trigger the AI Roadmap Agent' },
]

// Detect an in-progress @mention at the cursor (stops at @ or [ so completed @[...] won't re-trigger)
function getMentionQuery(text: string, cursorPos: number): string | null {
  const before = text.slice(0, cursorPos)
  const match = before.match(/@(?!\[)([^@[]*)$/)
  return match ? match[1] : null
}

export function ChatInput({
  onSend,
  disabled,
  onTyping,
  collaborators = [],
  currentUserId,
  onSearchOpen,
}: {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  onTyping?: () => void
  collaborators?: Collaborator[]
  currentUserId?: string
  onSearchOpen?: () => void
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const collabOptions: MentionOption[] = collaborators
    .filter(c => c.profiles?.display_name && c.user_id !== currentUserId)
    .map(c => ({
      name: c.profiles!.display_name!,
      display: `@${c.profiles!.display_name!}`,
      subtitle: c.is_main_artist ? 'Main artist' : 'Collaborator',
    }))

  const allMentions = [...SPECIAL_MENTIONS, ...collabOptions]

  const filteredMentions =
    mentionQuery === null
      ? []
      : allMentions.filter(m =>
          m.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          m.display.toLowerCase().includes(mentionQuery.toLowerCase()),
        )

  useEffect(() => { setMentionIndex(0) }, [mentionQuery])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    if (onTyping && val.trim()) onTyping()
    const pos = el.selectionStart ?? val.length
    setMentionQuery(getMentionQuery(val, pos))
  }

  function insertMention(name: string) {
    const pos = textareaRef.current?.selectionStart ?? text.length
    const before = text.slice(0, pos)
    const after = text.slice(pos)
    const match = before.match(/@(?!\[)[^@[]*$/)
    const atIdx = match ? before.length - match[0].length : before.length
    // Store as @[Name] so spaces are preserved unambiguously
    const inserted = `@[${name}] `
    const newText = before.slice(0, atIdx) + inserted + after
    setText(newText)
    setMentionQuery(null)
    setTimeout(() => {
      if (!textareaRef.current) return
      const newPos = atIdx + inserted.length
      textareaRef.current.setSelectionRange(newPos, newPos)
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }, 0)
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMentionQuery(null)
    try {
      await onSend(trimmed)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMentions.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMentions.length) % filteredMentions.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filteredMentions[mentionIndex].name); return }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-background">
      {/* @mention dropup — constrained to same max-width as the input row */}
      {filteredMentions.length > 0 && (
        <div className="px-6">
          <div className="max-w-3xl mx-auto mb-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {filteredMentions.map((m, i) => (
              <button
                key={m.name}
                type="button"
                onMouseDown={e => { e.preventDefault(); insertMention(m.name) }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === mentionIndex ? 'bg-accent' : 'hover:bg-accent/50',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  @
                </div>
                <div>
                  <p className="text-sm font-medium">{m.display}</p>
                  <p className="text-xs text-muted-foreground">{m.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end px-6 py-4 max-w-3xl mx-auto">
        {onSearchOpen && (
          <button
            type="button"
            onClick={onSearchOpen}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <Search size={15} />
          </button>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder="Message… (@ to mention, Enter to send)"
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 placeholder:text-muted-foreground leading-relaxed"
          style={{ minHeight: '42px', maxHeight: '160px' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
