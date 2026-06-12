'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useProfile, useUpdateNotifPrefs, DEFAULT_NOTIF_PREFS, type NotifPrefs } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const DIGEST_OPTIONS: { value: NotifPrefs['digest']; label: string }[] = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
]

export function NotificationSection({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId)
  const updateNotif = useUpdateNotifPrefs(userId)

  const rawPrefs = profile?.global_notif_prefs as unknown as NotifPrefs | null
  const current: NotifPrefs = rawPrefs ?? DEFAULT_NOTIF_PREFS

  const [prefs, setPrefs] = useState<NotifPrefs>(current)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (profile) setPrefs(rawPrefs ?? DEFAULT_NOTIF_PREFS)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  function toggle(key: keyof Omit<NotifPrefs, 'digest'>) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setDirty(true)
  }

  function setDigest(value: NotifPrefs['digest']) {
    const next = { ...prefs, digest: value }
    setPrefs(next)
    setDirty(true)
  }

  async function save() {
    await updateNotif.mutateAsync(prefs)
    setDirty(false)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-base mb-5">Notifications</h2>

      <div className="space-y-4">
        <Toggle
          label="Task updates"
          description="Assignments, completions, and status changes"
          checked={prefs.tasks}
          onChange={() => toggle('tasks')}
        />
        <Toggle
          label="Chat messages"
          description="New messages in your projects"
          checked={prefs.chat}
          onChange={() => toggle('chat')}
        />
        <Toggle
          label="Split signature requests"
          description="When a collaborator requests your signature"
          checked={prefs.signatures}
          onChange={() => toggle('signatures')}
        />
      </div>

      <div className="mt-6 pt-5 border-t border-border">
        <p className="text-sm font-medium mb-3">Email frequency</p>
        <div className="flex gap-2 flex-wrap">
          {DIGEST_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDigest(opt.value)}
              className={cn(
                'px-4 py-2 rounded-md text-sm border transition-colors whitespace-nowrap',
                prefs.digest === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {dirty && (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={updateNotif.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {updateNotif.isPending && <Loader2 size={13} className="animate-spin" />}
            Save preferences
          </button>
        </div>
      )}
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}
