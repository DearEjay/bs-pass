'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-muted-foreground text-sm">
          We sent a reset link to <strong>{email}</strong>. It expires in 1 hour.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Didn&apos;t receive it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            try again
          </button>
          .
        </p>
        <Link href="/login" className="inline-block text-sm text-foreground underline underline-offset-4 mt-2">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-1">Reset password</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && <p className="text-destructive text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Remember your password?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
