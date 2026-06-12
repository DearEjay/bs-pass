'use client'

import { useState } from 'react'
import { useCollaborators, usePendingInvites, useResendInvite, useCancelPendingInvite, useRemoveCollaborator, useRestoreCollaborator } from '@/hooks/useCollaborators'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUndoToastStore } from '@/hooks/useUndoToast'
import { InviteModal } from './InviteModal'
import { RemoveCollaboratorModal } from './RemoveCollaboratorModal'
import { ChangeRoleModal } from './ChangeRoleModal'
import { UserPlus, MoreHorizontal, Crown, Clock, Send, X, Loader2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Collaborator, PendingInvite } from '@/hooks/useCollaborators'

const ROLE_LABELS: Record<string, string> = {
  main_artist: 'Main Artist', featured_artist: 'Featured Artist',
  producer: 'Producer', co_producer: 'Co-Producer',
  recording_engineer: 'Recording Engineer', mixing_engineer: 'Mixing Engineer',
  mastering_engineer: 'Mastering Engineer', songwriter: 'Songwriter',
  session_musician: 'Session Musician', background_vocalist: 'Background Vocalist',
  manager: 'Manager', ar: 'A&R', graphic_designer: 'Graphic Designer',
  video_director: 'Video Director', marketing: 'Marketing',
}

function Avatar({ name, avatar_url }: { name: string | null; avatar_url: string | null }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  if (avatar_url) {
    return <img src={avatar_url} alt={name ?? ''} className="w-9 h-9 rounded-full object-cover" />
  }
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  )
}

function CollaboratorRow({
  collab,
  isCurrentUser,
  isMainArtist,
  onRemove,
  onChangeRoles,
}: {
  collab: Collaborator
  isCurrentUser: boolean
  isMainArtist: boolean
  onRemove: (c: Collaborator) => void
  onChangeRoles: (c: Collaborator) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-3 py-3 px-1 group">
      <Avatar name={collab.display_name} avatar_url={collab.avatar_url} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {collab.display_name ?? 'Unknown'}
          </span>
          {collab.is_main_artist && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-600 text-xs font-medium">
              <Crown size={10} />
              Owner
            </span>
          )}
          {collab.status === 'invited' && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">
              <Clock size={10} />
              Invited
            </span>
          )}
        </div>
        {collab.roles.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {collab.roles.map(r => ROLE_LABELS[r] ?? r).join(' · ')}
          </p>
        )}
      </div>

      {isMainArtist && !collab.is_main_artist && !isCurrentUser && (
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            <MoreHorizontal size={15} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="dropdown-menu right-0 top-full mt-1 w-48">
                <button
                  onClick={() => { setOpen(false); onChangeRoles(collab) }}
                  className="dropdown-item"
                >
                  <Pencil size={13} />
                  Change roles
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { setOpen(false); onRemove(collab) }}
                  className="dropdown-item-destructive"
                >
                  Remove collaborator
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PendingInviteRow({
  invite,
  projectId,
}: {
  invite: PendingInvite
  projectId: string
}) {
  const resend = useResendInvite(projectId)
  const cancel = useCancelPendingInvite(projectId)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-3 py-3 px-1 group opacity-70">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
        <Clock size={14} className="text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{invite.email}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
            Pending signup
          </span>
        </div>
        {invite.roles.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {invite.roles.map(r => ROLE_LABELS[r] ?? r).join(' · ')}
          </p>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
        >
          {(resend.isPending || cancel.isPending) ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={15} />}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="dropdown-menu right-0 top-full mt-1 w-48">
              <button
                onClick={() => {
                  setOpen(false)
                  resend.mutate({ email: invite.email, roles: invite.roles })
                }}
                className="dropdown-item"
              >
                <Send size={13} />
                Resend invite
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { setOpen(false); cancel.mutate(invite.id) }}
                className="dropdown-item-destructive"
              >
                <X size={13} />
                Cancel invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function CollaboratorList({ projectId }: { projectId: string }) {
  const { data: collaborators = [], isLoading: loadingCollabs } = useCollaborators(projectId)
  const { data: pendingInvites = [], isLoading: loadingPending } = usePendingInvites(projectId)
  const { data: currentUser } = useCurrentUser()
  const remove = useRemoveCollaborator(projectId)
  const restoreCollab = useRestoreCollaborator(projectId)
  const pushToast = useUndoToastStore(s => s.push)

  const [showInvite, setShowInvite] = useState(false)
  const [removing, setRemoving] = useState<Collaborator | null>(null)
  const [editingRoles, setEditingRoles] = useState<Collaborator | null>(null)

  const isMainArtist = collaborators.some(c => c.user_id === currentUser?.id && c.is_main_artist)

  async function handleRemoveConfirm() {
    if (!removing) return
    const collabId = removing.id
    const displayName = removing.display_name ?? 'Collaborator'
    await remove.mutateAsync({ collaboratorId: collabId, displayName })
    setRemoving(null)
    pushToast(`${displayName} removed`, async () => {
      await restoreCollab.mutateAsync(collabId)
    })
  }

  if (loadingCollabs) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Collaborators</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {collaborators.length} member{collaborators.length !== 1 ? 's' : ''}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending`}
          </p>
        </div>
        {isMainArtist && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus size={13} />
            Invite
          </button>
        )}
      </div>

      {/* Active collaborators */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {collaborators.map(c => (
          <div key={c.id} className="px-4">
            <CollaboratorRow
              collab={c}
              isCurrentUser={c.user_id === currentUser?.id}
              isMainArtist={isMainArtist}
              onRemove={setRemoving}
              onChangeRoles={setEditingRoles}
            />
          </div>
        ))}
        {collaborators.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No collaborators yet.</p>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Awaiting signup
          </h3>
          <div className="border border-border rounded-lg divide-y divide-border">
            {pendingInvites.map(inv => (
              <div key={inv.id} className="px-4">
                <PendingInviteRow invite={inv} projectId={projectId} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMainArtist && collaborators.length === 1 && pendingInvites.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Only the project owner can invite collaborators.
        </p>
      )}

      {showInvite && <InviteModal projectId={projectId} onClose={() => setShowInvite(false)} />}
      {removing && (
        <RemoveCollaboratorModal
          collaborator={removing}
          isPending={remove.isPending}
          error={remove.error as Error | null}
          onRemove={handleRemoveConfirm}
          onClose={() => setRemoving(null)}
        />
      )}
      {editingRoles && (
        <ChangeRoleModal
          projectId={projectId}
          collaborator={editingRoles}
          onClose={() => setEditingRoles(null)}
        />
      )}
    </div>
  )
}
