'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      await onSend(trimmed)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="shrink-0 bg-background border-t border-border px-6 py-4">
      <div className="flex gap-3 items-end max-w-3xl mx-auto">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder="Message project chat… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 placeholder:text-muted-foreground leading-relaxed"
          style={{ minHeight: '42px', maxHeight: '120px' }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`
          }}
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
