'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { SelectDropdown } from '@/components/ui/SelectDropdown'
import { cn } from '@/lib/utils'

const PRO_OPTIONS = [
  { value: '', label: 'None / Not registered' },
  { value: 'ASCAP', label: 'ASCAP' },
  { value: 'BMI', label: 'BMI' },
  { value: 'SESAC', label: 'SESAC' },
  { value: 'GMR', label: 'Global Music Rights (GMR)' },
  { value: 'SOCAN', label: 'SOCAN (Canada)' },
  { value: 'PRS', label: 'PRS for Music (UK)' },
  { value: 'SACEM', label: 'SACEM (France)' },
  { value: 'GEMA', label: 'GEMA (Germany)' },
  { value: 'APRA', label: 'APRA AMCOS (Australia/NZ)' },
  { value: 'JASRAC', label: 'JASRAC (Japan)' },
  { value: 'MCPS', label: 'MCPS (UK)' },
  { value: 'Other', label: 'Other' },
]

export function PublishingInfoSection({ userId }: { userId: string }) {
  const { data: profile, isLoading } = useProfile(userId)
  const updateProfile = useUpdateProfile(userId)

  const profileExt = profile as {
    pro_name?: string | null
    ipi_number?: string | null
  } | undefined

  const [proName, setProName] = useState('')
  const [ipiNumber, setIpiNumber] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setProName(profileExt?.pro_name ?? '')
      setIpiNumber(profileExt?.ipi_number ?? '')
      setDirty(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateProfile.mutateAsync({
      pro_name: proName || null,
      ipi_number: ipiNumber.trim() || null,
    } as Parameters<typeof updateProfile.mutateAsync>[0])
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="h-24 animate-pulse bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-base mb-1">Publishing Info</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Your performing rights organization and IPI number — included in splits agreements and PDFs.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        {/* PRO dropdown */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Performing Rights Organization (PRO)</label>
          <SelectDropdown
            value={proName}
            onChange={v => { setProName(v); setDirty(true); setSaved(false) }}
            options={PRO_OPTIONS}
          />
        </div>

        {/* IPI number */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            IPI Number
            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
          </label>
          <input
            type="text"
            value={ipiNumber}
            onChange={e => { setIpiNumber(e.target.value); setDirty(true); setSaved(false) }}
            placeholder="e.g. 000123456789"
            inputMode="numeric"
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            11-digit Interested Party Information number assigned by your PRO.
          </p>
        </div>

        {(dirty || saved) && (
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600">
                <Check size={14} />
                Saved
              </span>
            )}
            {dirty && (
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {updateProfile.isPending && <Loader2 size={13} className="animate-spin" />}
                Save
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
