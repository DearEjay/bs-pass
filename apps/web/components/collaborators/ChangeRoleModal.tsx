'use client'

import { useState } from 'react'
import { useUpdateCollaboratorRoles } from '@/hooks/useCollaborators'
import { X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Collaborator } from '@/hooks/useCollaborators'

const ROLES = [
  { slug: 'featured_artist',    label: 'Featured Artist' },
  { slug: 'producer',           label: 'Producer' },
  { slug: 'co_producer',        label: 'Co-Producer' },
  { slug: 'recording_engineer', label: 'Recording Engineer' },
  { slug: 'mixing_engineer',    label: 'Mixing Engineer' },
  { slug: 'mastering_engineer', label: 'Mastering Engineer' },
  { slug: 'songwriter',         label: 'Songwriter' },
  { slug: 'session_musician',   label: 'Session Musician' },
  { slug: 'background_vocalist',label: 'Background Vocalist' },
  { slug: 'manager',            label: 'Manager' },
  { slug: 'ar',                 label: 'A&R' },
  { slug: 'graphic_designer',   label: 'Graphic Designer' },
  { slug: 'video_director',     label: 'Video Director' },
  { slug: 'marketing',          label: 'Marketing' },
]

export function ChangeRoleModal({
  projectId,
  collaborator,
  onClose,
}: {
  projectId: string
  collaborator: Collaborator
  onClose: () => void
}) {
  const updateRoles = useUpdateCollaboratorRoles(projectId)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    collaborator.roles.filter(r => r !== 'main_artist')
  )

  function toggleRole(slug: string) {
    setSelectedRoles(prev =>
      prev.includes(slug) ? prev.filter(r => r !== slug) : [...prev, slug]
    )
  }

  async function handleSave() {
    if (selectedRoles.length === 0) return
    const roles = collaborator.is_main_artist ? ['main_artist', ...selectedRoles] : selectedRoles
    await updateRoles.mutateAsync({ collaboratorId: collaborator.id, roles })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-primary" />
            <div>
              <h2 className="font-semibold">Change roles</h2>
              <p className="text-xs text-muted-foreground">{collaborator.display_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Role(s) <span className="text-muted-foreground font-normal">(select at least one)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <button
                  key={role.slug}
                  type="button"
                  onClick={() => toggleRole(role.slug)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs border transition-colors',
                    selectedRoles.includes(role.slug)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
            {selectedRoles.length === 0 && (
              <p className="text-xs text-destructive">Select at least one role</p>
            )}
          </div>

          {updateRoles.error && (
            <p className="text-destructive text-sm">{(updateRoles.error as Error).message}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedRoles.length === 0 || updateRoles.isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updateRoles.isPending ? 'Saving…' : 'Save roles'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
