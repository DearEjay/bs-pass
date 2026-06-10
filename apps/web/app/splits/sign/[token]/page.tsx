'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Music2, CheckCircle2, XCircle, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface SplitDetails {
  split_id: string
  track_id: string
  track_title: string
  project_title: string
  percentage: number
  split_status: 'pending' | 'signed' | 'voided'
  token_expires_at: string | null
  collaborator_user_id: string
  other_splits: Array<{ display_name: string; percentage: number }>
}

export default function SignSplitPage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()

  const [details, setDetails] = useState<SplitDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string | undefined } | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser({ id: user.id, email: user.email })

      const { data, error } = await supabase.rpc('get_split_by_token', { p_token: token })
      if (error || !data) {
        setNotFound(true)
      } else {
        setDetails(data as unknown as SplitDetails)
      }
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSign() {
    if (!currentUser || !details) return
    setSigning(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/splits-sign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      setSigned(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSigning(false)
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
          <h1 className="text-xl font-semibold">Link not found</h1>
          <p className="text-muted-foreground text-sm">
            This signing link has expired, already been used, or doesn't exist.
          </p>
          <Link href="/login" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Go to app
          </Link>
        </div>
      </div>
    )
  }

  if (details?.split_status === 'voided') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="max-w-sm w-full text-center space-y-4">
          <XCircle size={40} className="text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Request voided</h1>
          <p className="text-muted-foreground text-sm">
            The splits for <strong>{details?.track_title}</strong> have been updated. The project owner will send a new signature request.
          </p>
        </div>
      </div>
    )
  }

  if (details?.split_status === 'signed' || signed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="max-w-sm w-full text-center space-y-4">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
          <h1 className="text-xl font-semibold">Signed!</h1>
          <p className="text-muted-foreground text-sm">
            You've signed the splits agreement for <strong>{details?.track_title}</strong>.
            {signed && ' A PDF will be emailed to all parties once everyone has signed.'}
          </p>
          {currentUser && (
            <Link href="/projects" className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Go to projects
            </Link>
          )}
        </div>
      </div>
    )
  }

  const isRecipient = currentUser?.id === details?.collaborator_user_id
  const isExpired = details?.token_expires_at && new Date(details.token_expires_at) < new Date()

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))]">
      <div className="max-w-sm w-full space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2 justify-center">
          <Music2 size={24} className="text-primary" />
          <span className="font-bold text-lg">BS-PASS</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">Review &amp; Sign</h1>
            <p className="text-muted-foreground text-sm">Splits Agreement</p>
          </div>

          {/* Track info */}
          <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium">{details?.project_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Track</span>
              <span className="font-medium">{details?.track_title}</span>
            </div>
          </div>

          {/* Split breakdown */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Split breakdown</p>
            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {/* Show other splits first */}
              {(details?.other_splits ?? []).map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">{s.display_name}</span>
                  <span className="font-medium tabular-nums">{Number(s.percentage).toFixed(2)}%</span>
                </div>
              ))}
              {/* Highlight the recipient's share */}
              <div className="flex items-center justify-between px-3 py-2.5 text-sm bg-primary/5 border-l-2 border-primary">
                <span className="font-medium text-primary">Your share</span>
                <span className="font-bold tabular-nums text-primary">{Number(details?.percentage).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
            <ShieldCheck size={13} className="shrink-0 mt-0.5" />
            By clicking "I Agree and Sign" you confirm your agreement to the split percentages above. This is an informal record of consent, not a legally certified e-signature.
          </div>

          {isExpired && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              This signing link has expired. Ask the project owner to resend.
            </div>
          )}

          {currentUser ? (
            isRecipient ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground text-center">
                  Signing as <strong>{currentUser.email}</strong>
                </p>
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSign}
                  disabled={signing || !!isExpired}
                  className="w-full py-2.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {signing ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Signing…</span>
                  ) : (
                    'I Agree and Sign'
                  )}
                </button>
              </div>
            ) : (
              // Logged in as wrong user
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-400/10 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  You're signed in as <strong>{currentUser.email}</strong>, but this link is for a different account.
                </div>
                <Link
                  href={`/login?next=/splits/sign/${token}`}
                  className="block w-full py-2.5 rounded-md border border-border text-sm text-center hover:bg-accent transition-colors"
                >
                  Sign in with a different account
                </Link>
              </div>
            )
          ) : (
            // Not logged in
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Sign in to execute your signature.
              </p>
              <Link
                href={`/login?next=/splits/sign/${token}`}
                className="block w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity"
              >
                Sign in to sign
              </Link>
              <Link
                href={`/signup?next=/splits/sign/${token}`}
                className="block w-full py-2.5 rounded-md border border-border text-sm text-center hover:bg-accent transition-colors"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
