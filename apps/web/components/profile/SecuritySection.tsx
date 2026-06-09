'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { useUpdateEmail, useUpdatePassword, useSignOut } from '@/hooks/useProfile'

export function SecuritySection({ email }: { email: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-8">
      <h2 className="font-semibold text-base">Security</h2>
      <EmailForm currentEmail={email} />
      <div className="border-t border-border pt-6">
        <PasswordForm />
      </div>
      <div className="border-t border-border pt-6">
        <SignOutRow />
      </div>
    </div>
  )
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const updateEmail = useUpdateEmail()
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || email === currentEmail) return
    await updateEmail.mutateAsync(email.trim())
    setSent(true)
    setEditing(false)
    setEmail('')
  }

  if (sent) {
    return (
      <div>
        <p className="text-sm font-medium mb-1">Email address</p>
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Check size={14} />
          Confirmation email sent to {email || currentEmail}. Check your inbox.
        </div>
        <button onClick={() => setSent(false)} className="text-xs text-muted-foreground mt-2 hover:underline">
          Send again
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium mb-1">Email address</p>
      <p className="text-xs text-muted-foreground mb-3">
        Current: <span className="text-foreground">{currentEmail}</span>
      </p>
      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="New email address"
            required
            autoFocus
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {updateEmail.error && (
            <p className="text-destructive text-xs">{(updateEmail.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateEmail.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updateEmail.isPending && <Loader2 size={13} className="animate-spin" />}
              Send confirmation
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEmail('') }}
              className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Change email
        </button>
      )}
    </div>
  )
}

function PasswordForm() {
  const updatePassword = useUpdatePassword()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) return
    await updatePassword.mutateAsync(password)
    setSaved(true)
    setPassword('')
    setConfirm('')
    setTimeout(() => setSaved(false), 3000)
  }

  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <div>
      <p className="text-sm font-medium mb-3">Change password</p>
      {saved ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Check size={14} />
          Password updated successfully.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={8}
              className="w-full px-3 py-2 pr-10 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <input
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            className={`w-full px-3 py-2 rounded-md bg-input border text-sm focus:outline-none focus:ring-2 focus:ring-ring ${mismatch ? 'border-destructive' : 'border-border'}`}
          />
          {mismatch && <p className="text-destructive text-xs">Passwords don&apos;t match.</p>}
          {updatePassword.error && (
            <p className="text-destructive text-xs">{(updatePassword.error as Error).message}</p>
          )}
          <button
            type="submit"
            disabled={updatePassword.isPending || mismatch || password.length < 8}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {updatePassword.isPending && <Loader2 size={13} className="animate-spin" />}
            Update password
          </button>
        </form>
      )}
    </div>
  )
}

function SignOutRow() {
  const signOut = useSignOut()

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">Sign out</p>
        <p className="text-xs text-muted-foreground mt-0.5">Sign out of your account on this device.</p>
      </div>
      <button
        type="button"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        {signOut.isPending && <Loader2 size={13} className="animate-spin" />}
        Sign out
      </button>
    </div>
  )
}
