'use client'

import { useState } from 'react'
import { useCollaborators, usePendingInvites, useResendInvite, useCancelPendingInvite } from '@/hooks/useCollaborators'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { InviteModal } from './InviteModal'
import { RemoveCollaboratorModal } from './RemoveCollaboratorModal'
import { UserPlus, MoreHorizontal, Crown, Clock, Send, X, Loader2 } from 'lucide-react'
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
}: {
  collab: Collaborator
  isCurrentUser: boolean
  isMainArtist: boolean
  onRemove: (c: Collaborator) => void
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
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {collab.roles.map(r => ROLE_LABELS[r] ?? r).join(' · ')}
          </p>
        )}
      </div>

      {isMainArtist && !collab.is_main_artist && !isCurrentUser && (
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreHorizontal size={16} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 w-36">
                <button
                  onClick={() => { setOpen(false); onRemove(collab) }}
                  className="w-full px-3 py-2 text-sm text-destructive hover:bg-accent text-left transition-colors"
                >
                  Remove
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
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          {(resend.isPending || cancel.isPending) ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 w-36">
              <button
                onClick={() => {
                  setOpen(false)
                  resend.mutate({ email: invite.email, roles: invite.roles })
                }}
                className="w-full px-3 py-2 text-sm hover:bg-accent text-left transition-colors flex items-center gap-2"
              >
                <Send size={13} />
                Resend
              </button>
              <button
                onClick={() => { setOpen(false); cancel.mutate(invite.id) }}
                className="w-full px-3 py-2 text-sm text-destructive hover:bg-accent text-left transition-colors flex items-center gap-2"
              >
                <X size={13} />
                Cancel
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

  const [showInvite, setShowInvite] = useState(false)
  const [removing, setRemoving] = useState<Collaborator | null>(null)

  const isMainArtist = collaborators.some(c => c.user_id === currentUser?.id && c.is_main_artist)

  if (loadingCollabs) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
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
      <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
        {collaborators.map(c => (
          <div key={c.id} className="px-4">
            <CollaboratorRow
              collab={c}
              isCurrentUser={c.user_id === currentUser?.id}
              isMainArtist={isMainArtist}
              onRemove={setRemoving}
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
          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
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
          projectId={projectId}
          collaborator={removing}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  )
}
