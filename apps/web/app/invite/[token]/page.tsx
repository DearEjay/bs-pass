'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAcceptInvite } from '@/hooks/useCollaborators'
import { Music2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  main_artist: 'Main Artist', featured_artist: 'Featured Artist',
  producer: 'Producer', co_producer: 'Co-Producer',
  recording_engineer: 'Recording Engineer', mixing_engineer: 'Mixing Engineer',
  mastering_engineer: 'Mastering Engineer', songwriter: 'Songwriter',
  session_musician: 'Session Musician', background_vocalist: 'Background Vocalist',
  manager: 'Manager', ar: 'A&R', graphic_designer: 'Graphic Designer',
  video_director: 'Video Director', marketing: 'Marketing',
}

interface InviteDetails {
  source: 'pending' | 'registered'
  project_title: string
  project_id: string
  collaborator_id?: string
  roles: string[]
  expires_at?: string
}

export default function InvitePage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()
  const acceptInvite = useAcceptInvite()

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | undefined } | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Check current auth state
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser({ id: user.id, email: user.email })

      // Fetch invite details via RPC (works for anon + authenticated)
      const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token })
      if (error || !data) {
        setNotFound(true)
      } else {
        setInvite(data as unknown as InviteDetails)
      }
      setLoading(false)
    }
    load()
  }, [token])

  async function handleAccept() {
    if (!currentUser || !invite) return
    try {
      const result = await acceptInvite.mutateAsync({ token })
      setAccepted(true)
      setTimeout(() => router.push(`/projects/${result.projectId}/collaborators`), 1500)
    } catch (e) {
      // error shown below
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="max-w-sm w-full text-center space-y-4">
          <XCircle size={40} className="text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Invite not found</h1>
          <p className="text-muted-foreground text-sm">
            This invitation link has expired, already been accepted, or doesn't exist.
          </p>
          <Link href="/login" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Go to app
          </Link>
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="max-w-sm w-full text-center space-y-4">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
          <h1 className="text-xl font-semibold">You're in!</h1>
          <p className="text-muted-foreground text-sm">
            You've joined <strong>{invite?.project_title}</strong>. Redirecting you to the project…
          </p>
        </div>
      </div>
    )
  }

  const roleLabels = (invite?.roles ?? []).map(r => ROLE_LABELS[r] ?? r).join(', ')

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
      <div className="max-w-sm w-full space-y-6">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 justify-center">
          <Music2 size={24} className="text-primary" />
          <span className="font-bold text-lg">BS-PASS</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">You've been invited</h1>
            <p className="text-muted-foreground text-sm">to collaborate on a music project</p>
          </div>

          <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium">{invite?.project_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role(s)</span>
              <span className="font-medium">{roleLabels || 'Collaborator'}</span>
            </div>
          </div>

          {currentUser ? (
            // User is logged in → show accept button
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Signed in as <strong>{currentUser.email}</strong>
              </p>
              <button
                onClick={handleAccept}
                disabled={acceptInvite.isPending}
                className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {acceptInvite.isPending ? 'Accepting…' : 'Accept invitation'}
              </button>
              {acceptInvite.error && (
                <p className="text-destructive text-sm text-center">
                  {(acceptInvite.error as Error).message}
                </p>
              )}
            </div>
          ) : invite?.source === 'pending' ? (
            // No account for this email → send to signup
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Create a free account to accept this invitation.
              </p>
              <Link
                href={`/signup?next=/invite/${token}`}
                className="block w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity"
              >
                Create account &amp; accept
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href={`/login?next=/invite/${token}`} className="text-foreground underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            // Registered user → send to login
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Sign in to accept this invitation.
              </p>
              <Link
                href={`/login?next=/invite/${token}`}
                className="block w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity"
              >
                Sign in to accept
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                New to BS-PASS?{' '}
                <Link href={`/signup?next=/invite/${token}`} className="text-foreground underline underline-offset-2">
                  Create account
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
