const ZWNJ = '‌'

// ── time formatting ──────────────────────────────────────────────────────────

/**
 * Returns a human-readable relative time string.
 * `now` is injectable for deterministic tests (defaults to Date.now()).
 */
export function timeAgo(dateStr: string | null, now = Date.now()): string {
  if (!dateStr) return ''
  const diff = now - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── @mention parsing ─────────────────────────────────────────────────────────

export type ChatPart =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; name: string }

/**
 * Splits a chat message body into text segments and @mention tokens.
 *
 * Supported mention formats:
 *   @[Full Name]  — bracket format used by agent
 *   @Name‌         — ZWNJ-terminated format used by ChatInput
 *   @word          — simple single-word mention
 */
export function parseChatBody(body: string): ChatPart[] {
  const re = new RegExp(`(@\\[[^\\]]+\\]|@[^@${ZWNJ}\\n]+${ZWNJ}|@[\\w]+)`, 'g')
  const parts = body.split(re)
  const result: ChatPart[] = []
  for (const part of parts) {
    if (!part) continue
    if (/^@\[([^\]]+)\]$/.test(part)) {
      result.push({ kind: 'mention', name: part.slice(2, -1) })
    } else if (part.startsWith('@') && part.endsWith(ZWNJ)) {
      result.push({ kind: 'mention', name: part.slice(1, -1) })
    } else if (/^@[\w]+$/.test(part)) {
      result.push({ kind: 'mention', name: part.slice(1) })
    } else {
      result.push({ kind: 'text', value: part })
    }
  }
  return result
}

/** Returns all mention names found in a chat message body. */
export function extractMentionNames(body: string): string[] {
  return parseChatBody(body)
    .filter((p): p is { kind: 'mention'; name: string } => p.kind === 'mention')
    .map(p => p.name)
}

// ── search highlighting ───────────────────────────────────────────────────────

export interface HighlightMatch {
  before: string
  match: string
  after: string
}

/** Finds the first occurrence of `query` in `text` (case-insensitive). */
export function findHighlight(text: string, query: string): HighlightMatch | null {
  if (!query) return null
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return null
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + query.length),
    after: text.slice(idx + query.length),
  }
}

// ── mention detection at cursor ───────────────────────────────────────────────

/**
 * Given text and a cursor position, returns the in-progress @mention query
 * (the text after the last unresolved @), or null if there is none.
 * ZWNJ marks the end of an already-completed mention so we don't re-trigger.
 */
export function detectMentionAtCursor(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor)
  const match = before.match(new RegExp(`@([^@${ZWNJ}]*)$`))
  return match ? match[1] : null
}

// ── reaction grouping ─────────────────────────────────────────────────────────

export interface GroupedReaction {
  emoji: string
  count: number
  mine: boolean
}

/**
 * Groups a flat reaction list into per-emoji counts, maintaining
 * the order of `tapbackOrder`. Reactions for emojis not in tapbackOrder
 * are omitted.
 */
export function groupReactions(
  reactions: Array<{ emoji: string; user_id: string }>,
  currentUserId: string,
  tapbackOrder: readonly string[],
): GroupedReaction[] {
  const map = new Map<string, { count: number; mine: boolean }>()
  for (const r of reactions) {
    const existing = map.get(r.emoji) ?? { count: 0, mine: false }
    map.set(r.emoji, {
      count: existing.count + 1,
      mine: existing.mine || r.user_id === currentUserId,
    })
  }
  return tapbackOrder.flatMap(e => {
    const d = map.get(e)
    return d ? [{ emoji: e, ...d }] : []
  })
}
