'use client'

import { useRemoveCollaborator } from '@/hooks/useCollaborators'
import { AlertTriangle, X } from 'lucide-react'
import type { Collaborator } from '@/hooks/useCollaborators'

export function RemoveCollaboratorModal({
  projectId,
  collaborator,
  onClose,
}: {
  projectId: string
  collaborator: Collaborator
  onClose: () => void
}) {
  const remove = useRemoveCollaborator(projectId)

  async function handleRemove() {
    await remove.mutateAsync({
      collaboratorId: collaborator.id,
      displayName: collaborator.display_name ?? 'Collaborator',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-destructive" />
            <h2 className="font-semibold">Remove collaborator</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove{' '}
            <span className="font-medium text-foreground">{collaborator.display_name ?? 'this collaborator'}</span>?
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Their tasks will be unassigned</li>
            <li>Any pending split signatures will be voided</li>
            <li>They will lose access to this project</li>
          </ul>

          {remove.error && (
            <p className="text-destructive text-sm">{(remove.error as Error).message}</p>
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
              onClick={handleRemove}
              disabled={remove.isPending}
              className="flex-1 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {remove.isPending ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
