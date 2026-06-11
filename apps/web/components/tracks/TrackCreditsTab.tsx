'use client'

import { useState } from 'react'
import { useTrackCredits, useUpsertCredit, useDeleteCredit } from '@/hooks/useTrackExtras'
import { useCollaborators } from '@/hooks/useCollaborators'
import { Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  main_artist: 'Main Artist', featured_artist: 'Featured Artist',
  producer: 'Producer', co_producer: 'Co-Producer',
  recording_engineer: 'Recording Engineer', mixing_engineer: 'Mixing Engineer',
  mastering_engineer: 'Mastering Engineer', songwriter: 'Songwriter',
  session_musician: 'Session Musician', background_vocalist: 'Background Vocalist',
  manager: 'Manager', ar: 'A&R', graphic_designer: 'Graphic Designer',
  video_director: 'Video Director', marketing: 'Marketing',
}

function roleKeyFromLabel(label: string): string {
  return Object.entries(ROLE_LABELS).find(([, v]) => v === label)?.[0] ?? ''
}

export function TrackCreditsTab({ trackId, projectId }: { trackId: string; projectId: string }) {
  const { data: credits = [], isLoading } = useTrackCredits(trackId)
  const { data: allCollaborators = [] } = useCollaborators(projectId)
  const upsertCredit = useUpsertCredit(trackId)
  const deleteCredit = useDeleteCredit(trackId)

  const collaborators = allCollaborators.filter(c => !c.is_main_artist)

  // Ghost row state (adding new)
  const [ghostCollabId, setGhostCollabId] = useState('')
  const [ghostRole, setGhostRole] = useState('')

  // Inline edit state (editing existing row)
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null)
  const [editCollabId, setEditCollabId] = useState('')
  const [editRole, setEditRole] = useState('')

  function startEdit(creditId: string, currentName: string, currentRole: string) {
    const matched = collaborators.find(
      c => (c.display_name ?? '').toLowerCase() === currentName.toLowerCase(),
    )
    setEditCollabId(matched?.id ?? (collaborators[0]?.id ?? ''))
    setEditRole(roleKeyFromLabel(currentRole))
    setEditingCreditId(creditId)
  }

  async function commitEdit(creditId: string) {
    if (!editCollabId || !editRole) { setEditingCreditId(null); return }
    const collab = collaborators.find(c => c.id === editCollabId)
    const name = collab?.display_name?.trim() ?? ''
    if (!name) { setEditingCreditId(null); return }
    setEditingCreditId(null)
    await upsertCredit.mutateAsync({ id: creditId, name, role: ROLE_LABELS[editRole] ?? editRole })
  }

  const ghostCollab = collaborators.find(c => c.id === ghostCollabId)
  const ghostRoles = ghostCollab?.roles.filter(r => r !== 'main_artist') ?? []

  async function commitGhostRow() {
    if (!ghostCollabId || !ghostRole) return
    const name = ghostCollab?.display_name?.trim() ?? ''
    if (!name) return
    await upsertCredit.mutateAsync({ name, role: ROLE_LABELS[ghostRole] ?? ghostRole, sort_order: credits.length })
    setGhostCollabId('')
    setGhostRole('')
  }

  const editCollab = collaborators.find(c => c.id === editCollabId)
  const editRoles = editCollab?.roles.filter(r => r !== 'main_artist') ?? []

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
          {credits.map(credit => {
            const isEditing = editingCreditId === credit.id
            return (
              <tr key={credit.id} className="border-b border-border/50 group">
                <td className="py-1.5 pr-2">
                  {isEditing ? (
                    <select
                      autoFocus
                      value={editCollabId}
                      onChange={e => { setEditCollabId(e.target.value); setEditRole('') }}
                      className="w-full bg-input border border-primary/50 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {collaborators.map(c => (
                        <option key={c.id} value={c.id}>{c.display_name ?? c.id}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => startEdit(credit.id, credit.name, credit.role)}
                      className="block cursor-pointer hover:bg-accent/50 px-2 py-0.5 rounded transition-colors"
                    >
                      {credit.name}
                    </span>
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  {isEditing ? (
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      onBlur={() => commitEdit(credit.id)}
                      className="w-full bg-input border border-primary/50 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select role…</option>
                      {editRoles.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => startEdit(credit.id, credit.name, credit.role)}
                      className={cn(
                        'block cursor-pointer hover:bg-accent/50 px-2 py-0.5 rounded transition-colors',
                        !credit.role && 'text-muted-foreground italic',
                      )}
                    >
                      {credit.role || '—'}
                    </span>
                  )}
                </td>
                <td className="py-1.5">
                  <button
                    onClick={() => deleteCredit.mutate(credit.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            )
          })}

          {/* Ghost row — add new credit */}
          {collaborators.length > 0 && (
            <tr className="border-b border-border/30">
              <td className="py-1.5 pr-2">
                <select
                  value={ghostCollabId}
                  onChange={e => { setGhostCollabId(e.target.value); setGhostRole('') }}
                  className="w-full bg-transparent px-2 py-0.5 rounded text-sm focus:outline-none focus:bg-input focus:border focus:border-primary/50 text-muted-foreground transition-colors"
                >
                  <option value="">Add credit…</option>
                  {collaborators.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name ?? c.id}</option>
                  ))}
                </select>
              </td>
              <td className="py-1.5 pr-2">
                {ghostCollabId && ghostRoles.length > 0 ? (
                  <select
                    value={ghostRole}
                    onChange={e => setGhostRole(e.target.value)}
                    onBlur={commitGhostRow}
                    className="w-full bg-transparent px-2 py-0.5 rounded text-sm focus:outline-none focus:bg-input focus:border focus:border-primary/50 text-muted-foreground transition-colors"
                  >
                    <option value="">Select role…</option>
                    {ghostRoles.map(r => (
                      <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-0.5 text-sm text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="py-1.5">
                <Plus size={13} className="text-muted-foreground/30" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
