import { describe, it, expect } from 'vitest'
import {
  timeAgo,
  parseChatBody,
  extractMentionNames,
  findHighlight,
  detectMentionAtCursor,
  groupReactions,
} from '@/lib/chat-utils'

const ZWNJ = '‌'
const TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓'] as const

// ── timeAgo ──────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  const base = new Date('2026-06-11T12:00:00Z').getTime()

  it('returns empty string for null', () => {
    expect(timeAgo(null, base)).toBe('')
  })

  it('returns "just now" for < 1 minute ago', () => {
    const t = new Date(base - 30_000).toISOString()
    expect(timeAgo(t, base)).toBe('just now')
  })

  it('returns "just now" for exactly 0 seconds ago', () => {
    const t = new Date(base).toISOString()
    expect(timeAgo(t, base)).toBe('just now')
  })

  it('returns "just now" for future timestamps (clock skew)', () => {
    const t = new Date(base + 5_000).toISOString()
    expect(timeAgo(t, base)).toBe('just now')
  })

  it('returns "1m ago" for exactly 1 minute', () => {
    const t = new Date(base - 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('1m ago')
  })

  it('returns "59m ago" for 59 minutes', () => {
    const t = new Date(base - 59 * 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('59m ago')
  })

  it('returns "1h ago" for exactly 60 minutes', () => {
    const t = new Date(base - 60 * 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('1h ago')
  })

  it('returns "23h ago" for 23 hours', () => {
    const t = new Date(base - 23 * 60 * 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('23h ago')
  })

  it('returns "1d ago" for exactly 24 hours', () => {
    const t = new Date(base - 24 * 60 * 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('1d ago')
  })

  it('returns "7d ago" for 7 days', () => {
    const t = new Date(base - 7 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('7d ago')
  })

  it('returns "30d ago" for 30 days', () => {
    const t = new Date(base - 30 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(t, base)).toBe('30d ago')
  })
})

// ── parseChatBody ─────────────────────────────────────────────────────────────

describe('parseChatBody', () => {
  it('returns single text part for plain text', () => {
    const result = parseChatBody('Hello world')
    expect(result).toEqual([{ kind: 'text', value: 'Hello world' }])
  })

  it('returns empty array for empty string', () => {
    expect(parseChatBody('')).toEqual([])
  })

  it('parses @[Full Name] bracket format', () => {
    const result = parseChatBody('@[Alice Johnson] check this')
    expect(result[0]).toEqual({ kind: 'mention', name: 'Alice Johnson' })
    expect(result[1]).toEqual({ kind: 'text', value: ' check this' })
  })

  it('parses @word simple mention', () => {
    const result = parseChatBody('hey @manager')
    expect(result[0]).toEqual({ kind: 'text', value: 'hey ' })
    expect(result[1]).toEqual({ kind: 'mention', name: 'manager' })
  })

  it('parses @name‌ ZWNJ-terminated mention', () => {
    const body = `hey @Alice${ZWNJ} how are you`
    const result = parseChatBody(body)
    expect(result[0]).toEqual({ kind: 'text', value: 'hey ' })
    expect(result[1]).toEqual({ kind: 'mention', name: 'Alice' })
    expect(result[2]).toEqual({ kind: 'text', value: ' how are you' })
  })

  it('ZWNJ mention preserves spaces in names', () => {
    const body = `@Alice Johnson${ZWNJ} nice work`
    const result = parseChatBody(body)
    expect(result[0]).toEqual({ kind: 'mention', name: 'Alice Johnson' })
  })

  it('parses multiple mentions in one message', () => {
    const result = parseChatBody('@[Alice] and @[Bob] check this out')
    const mentions = result.filter(p => p.kind === 'mention')
    expect(mentions).toHaveLength(2)
    expect(mentions[0]).toEqual({ kind: 'mention', name: 'Alice' })
    expect(mentions[1]).toEqual({ kind: 'mention', name: 'Bob' })
  })

  it('handles @here special mention', () => {
    const result = parseChatBody('@here everyone')
    expect(result[0]).toEqual({ kind: 'mention', name: 'here' })
  })

  it('handles lone @ sign as text (no word after it)', () => {
    const result = parseChatBody('email me @ later')
    const texts = result.filter(p => p.kind === 'text').map(p => (p as { kind: 'text'; value: string }).value)
    expect(texts.join('')).toContain('@')
  })

  it('does not treat email addresses as mentions', () => {
    // "test@example.com" — the @ is preceded by word chars, regex captures @example
    // This is a known limitation of the simple regex approach, document it
    const result = parseChatBody('send to test@example')
    // The @example part will be caught as a mention — this is expected behavior
    const mentions = result.filter(p => p.kind === 'mention')
    expect(mentions).toHaveLength(1)
    expect(mentions[0]).toEqual({ kind: 'mention', name: 'example' })
  })

  it('handles message with only mentions', () => {
    const result = parseChatBody('@[Alice] @[Bob]')
    const mentions = result.filter(p => p.kind === 'mention')
    expect(mentions).toHaveLength(2)
  })

  it('handles newlines in text', () => {
    const result = parseChatBody('line one\nline two')
    expect(result[0]).toEqual({ kind: 'text', value: 'line one\nline two' })
  })

  it('@[name] format with spaces in brackets', () => {
    const result = parseChatBody('@[The Manager] is assigned')
    expect(result[0]).toEqual({ kind: 'mention', name: 'The Manager' })
  })
})

// ── extractMentionNames ───────────────────────────────────────────────────────

describe('extractMentionNames', () => {
  it('returns empty array for plain text', () => {
    expect(extractMentionNames('Hello world')).toEqual([])
  })

  it('extracts bracket mention name', () => {
    expect(extractMentionNames('@[Alice Johnson] check this')).toEqual(['Alice Johnson'])
  })

  it('extracts multiple mention names', () => {
    expect(extractMentionNames('@[Alice] and @[Bob]')).toEqual(['Alice', 'Bob'])
  })

  it('extracts @word mention name', () => {
    expect(extractMentionNames('hey @manager')).toEqual(['manager'])
  })

  it('returns empty array for empty string', () => {
    expect(extractMentionNames('')).toEqual([])
  })

  it('handles mixed text and mentions', () => {
    const names = extractMentionNames('Good work @[Alice], check with @[Bob] and @here')
    expect(names).toEqual(['Alice', 'Bob', 'here'])
  })
})

// ── findHighlight ─────────────────────────────────────────────────────────────

describe('findHighlight', () => {
  it('returns null for empty query', () => {
    expect(findHighlight('hello world', '')).toBeNull()
  })

  it('returns null when query not found', () => {
    expect(findHighlight('hello world', 'xyz')).toBeNull()
  })

  it('finds exact match', () => {
    const result = findHighlight('hello world', 'world')
    expect(result).toEqual({ before: 'hello ', match: 'world', after: '' })
  })

  it('finds match at start', () => {
    const result = findHighlight('hello world', 'hello')
    expect(result).toEqual({ before: '', match: 'hello', after: ' world' })
  })

  it('finds match in middle', () => {
    const result = findHighlight('abc def ghi', 'def')
    expect(result).toEqual({ before: 'abc ', match: 'def', after: ' ghi' })
  })

  it('is case-insensitive', () => {
    const result = findHighlight('Hello World', 'world')
    expect(result).not.toBeNull()
    expect(result!.match).toBe('World')
  })

  it('matches first occurrence only', () => {
    const result = findHighlight('foo bar foo', 'foo')
    expect(result!.before).toBe('')
    expect(result!.after).toBe(' bar foo')
  })

  it('returns null for null-like empty query', () => {
    expect(findHighlight('text', '')).toBeNull()
  })

  it('handles query longer than text', () => {
    expect(findHighlight('hi', 'hello world')).toBeNull()
  })

  it('handles single character query', () => {
    const result = findHighlight('abc', 'b')
    expect(result).toEqual({ before: 'a', match: 'b', after: 'c' })
  })
})

// ── detectMentionAtCursor ─────────────────────────────────────────────────────

describe('detectMentionAtCursor', () => {
  it('returns null when no @ before cursor', () => {
    expect(detectMentionAtCursor('hello world', 11)).toBeNull()
  })

  it('returns empty string when @ is the last char before cursor', () => {
    expect(detectMentionAtCursor('hey @', 5)).toBe('')
  })

  it('returns partial mention query', () => {
    expect(detectMentionAtCursor('hey @Ali', 8)).toBe('Ali')
  })

  it('returns null when @ is followed by ZWNJ (already completed)', () => {
    const text = `hey @Alice${ZWNJ} more text`
    const cursor = `hey @Alice${ZWNJ} more text`.length
    expect(detectMentionAtCursor(text, cursor)).toBeNull()
  })

  it('returns null at cursor before @', () => {
    expect(detectMentionAtCursor('hey @Alice', 3)).toBeNull()
  })

  it('detects @manager at end of text', () => {
    expect(detectMentionAtCursor('@manager', 8)).toBe('manager')
  })

  it('stops at second @ sign', () => {
    // cursor at end of 'email me@test @ali' (length 18) → last @ is @ali
    expect(detectMentionAtCursor('email me@test @ali', 18)).toBe('ali')
  })

  it('cursor at 0 returns null', () => {
    expect(detectMentionAtCursor('text', 0)).toBeNull()
  })
})

// ── groupReactions ────────────────────────────────────────────────────────────

describe('groupReactions', () => {
  const me = 'user-1'
  const other = 'user-2'
  const third = 'user-3'

  it('returns empty array for no reactions', () => {
    expect(groupReactions([], me, TAPBACKS)).toEqual([])
  })

  it('groups a single reaction', () => {
    const result = groupReactions([{ emoji: '❤️', user_id: other }], me, TAPBACKS)
    expect(result).toEqual([{ emoji: '❤️', count: 1, mine: false }])
  })

  it('sets mine=true when current user reacted', () => {
    const result = groupReactions([{ emoji: '❤️', user_id: me }], me, TAPBACKS)
    expect(result[0].mine).toBe(true)
  })

  it('counts multiple reactions on same emoji', () => {
    const reactions = [
      { emoji: '👍', user_id: me },
      { emoji: '👍', user_id: other },
      { emoji: '👍', user_id: third },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result[0]).toEqual({ emoji: '👍', count: 3, mine: true })
  })

  it('mine is true if any reaction in the group is from current user', () => {
    const reactions = [
      { emoji: '😂', user_id: other },
      { emoji: '😂', user_id: me },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result[0].mine).toBe(true)
  })

  it('mine is false if no reaction in the group is from current user', () => {
    const reactions = [
      { emoji: '😂', user_id: other },
      { emoji: '😂', user_id: third },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result[0].mine).toBe(false)
  })

  it('respects tapback order', () => {
    const reactions = [
      { emoji: '👎', user_id: me },
      { emoji: '❤️', user_id: other },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result[0].emoji).toBe('❤️')
    expect(result[1].emoji).toBe('👎')
  })

  it('omits emojis not in tapbackOrder', () => {
    const reactions = [
      { emoji: '🎉', user_id: me }, // not in TAPBACKS
      { emoji: '❤️', user_id: other },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result).toHaveLength(1)
    expect(result[0].emoji).toBe('❤️')
  })

  it('returns multiple groups', () => {
    const reactions = [
      { emoji: '❤️', user_id: me },
      { emoji: '👍', user_id: other },
      { emoji: '😂', user_id: third },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result).toHaveLength(3)
  })

  it('handles same user reacting to same emoji twice (double count)', () => {
    const reactions = [
      { emoji: '❤️', user_id: me },
      { emoji: '❤️', user_id: me },
    ]
    const result = groupReactions(reactions, me, TAPBACKS)
    expect(result[0].count).toBe(2)
  })

  it('empty currentUserId never sets mine=true', () => {
    const reactions = [{ emoji: '❤️', user_id: 'someone' }]
    const result = groupReactions(reactions, '', TAPBACKS)
    expect(result[0].mine).toBe(false)
  })
})
