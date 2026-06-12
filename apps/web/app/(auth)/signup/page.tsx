'use client'

import { Suspense, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

const TOS_VERSION = '2026-06-12'

function SignupForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/projects'
  const { executeRecaptcha } = useGoogleReCaptcha()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tosAccepted, setTosAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tosAccepted) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.')
      return
    }
    setError(null)
    setLoading(true)

    // reCAPTCHA v3 check
    if (executeRecaptcha) {
      try {
        const token = await executeRecaptcha('signup')
        const res = await fetch('/api/recaptcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (!res.ok) {
          setError('Security check failed. Please try again.')
          setLoading(false)
          return
        }
      } catch {
        setError('Security check failed. Please try again.')
        setLoading(false)
        return
      }
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
          tos_accepted: true,
          tos_version: TOS_VERSION,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = next
  }, [tosAccepted, executeRecaptcha, email, password, displayName, next])

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Create account</h2>
      <p className="text-muted-foreground text-sm mb-6">Start managing your music projects</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Full name</label>
          <input
            id="name"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            placeholder="First and last legal name"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={e => { setTosAccepted(e.target.checked); if (e.target.checked) setError(null) }}
              className="sr-only peer"
            />
            <div className="w-4 h-4 rounded border border-border bg-input peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center">
              {tosAccepted && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-primary-foreground">
                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" className="text-foreground underline underline-offset-2 hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            , including the disclaimer regarding royalty split agreements.
          </span>
        </label>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !tosAccepted}
          className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-[11px] text-muted-foreground/60 text-center">
          Protected by reCAPTCHA.{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">Privacy</a>
          {' '}·{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2">Terms</a>
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{' '}
        <Link href={`/login${next !== '/projects' ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
