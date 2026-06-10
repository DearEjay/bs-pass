'use client'

import { useState } from 'react'
import { useTrackCredits, useUpsertCredit, useDeleteCredit } from '@/hooks/useTrackExtras'
import { Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableCell {
  creditId: string | null // null = ghost row
  field: 'name' | 'role'
}

export function TrackCreditsTab({ trackId }: { trackId: string }) {
  const { data: credits = [], isLoading } = useTrackCredits(trackId)
  const upsertCredit = useUpsertCredit(trackId)
  const deleteCredit = useDeleteCredit(trackId)

  // Ghost row state
  const [ghostName, setGhostName] = useState('')
  const [ghostRole, setGhostRole] = useState('')

  // Which cell is actively editing
  const [editing, setEditing] = useState<EditableCell | null>(null)
  const [draft, setDraft] = useState('')

  function startEdit(creditId: string, field: 'name' | 'role', current: string) {
    setEditing({ creditId, field })
    setDraft(current)
  }

  async function commitEdit(creditId: string, field: 'name' | 'role') {
    const credit = credits.find(c => c.id === creditId)
    if (!credit) return
    setEditing(null)
    const trimmed = draft.trim()
    if (!trimmed) return // don't save empty
    const updated = field === 'name'
      ? { id: creditId, name: trimmed, role: credit.role }
      : { id: creditId, name: credit.name, role: trimmed }
    await upsertCredit.mutateAsync(updated)
  }

  async function commitGhostRow() {
    const name = ghostName.trim()
    const role = ghostRole.trim()
    if (!name && !role) return
    await upsertCredit.mutateAsync({ name: name || '—', role: role || '—', sort_order: credits.length })
    setGhostName('')
    setGhostRole('')
  }

  if (isLoading) {
    return <div className="px-3 py-4 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 rounded bg-muted/30 animate-pulse" />)}</div>
  }

  return (
    <div className="px-3 pb-4 pt-3 space-y-2">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Credits</span>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-1.5 font-medium w-1/2">Name</th>
            <th className="text-left py-1.5 font-medium w-1/2">Role</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {credits.map(credit => (
            <tr key={credit.id} className="border-b border-border/50 group">
              {(['name', 'role'] as const).map(field => (
                <td key={field} className="py-1.5 pr-2">
                  {editing !== null && editing.creditId === credit.id && editing.field === field ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onBlur={() => commitEdit(credit.id, field)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(credit.id, field) }
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      className="w-full bg-input border border-primary rounded px-2 py-0.5 text-sm focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(credit.id, field, credit[field])}
                      className={cn(
                        'block cursor-text hover:bg-accent/50 px-2 py-0.5 rounded transition-colors',
                        !credit[field] && 'text-muted-foreground italic',
                      )}
                    >
                      {credit[field] || 'Click to edit'}
                    </span>
                  )}
                </td>
              ))}
              <td className="py-1.5">
                <button
                  onClick={() => deleteCredit.mutate(credit.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}

          {/* Ghost row */}
          <tr className="border-b border-border/30">
            <td className="py-1.5 pr-2">
              <input
                value={ghostName}
                onChange={e => setGhostName(e.target.value)}
                onBlur={commitGhostRow}
                onKeyDown={e => e.key === 'Tab' && !ghostName.trim() && e.preventDefault()}
                placeholder="Add name…"
                className="w-full bg-transparent px-2 py-0.5 rounded text-sm focus:outline-none focus:bg-input focus:border focus:border-primary/50 placeholder:text-muted-foreground/50 transition-colors"
              />
            </td>
            <td className="py-1.5 pr-2">
              <input
                value={ghostRole}
                onChange={e => setGhostRole(e.target.value)}
                onBlur={commitGhostRow}
                placeholder="Add role…"
                className="w-full bg-transparent px-2 py-0.5 rounded text-sm focus:outline-none focus:bg-input focus:border focus:border-primary/50 placeholder:text-muted-foreground/50 transition-colors"
              />
            </td>
            <td className="py-1.5">
              <Plus size={13} className="text-muted-foreground/30" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
