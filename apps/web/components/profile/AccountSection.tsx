'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Check, Loader2, User } from 'lucide-react'
import { useProfile, useUpdateProfile, useUploadAvatar } from '@/hooks/useProfile'

export function AccountSection({ userId, email }: { userId: string; email: string }) {
  const { data: profile, isLoading } = useProfile(userId)
  const updateProfile = useUpdateProfile(userId)
  const uploadAvatar = useUploadAvatar(userId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  function startEditing() {
    setDisplayName(profile?.display_name ?? '')
    setNameEditing(true)
    setNameSaved(false)
  }

  async function saveName() {
    if (!displayName.trim()) return
    await updateProfile.mutateAsync({ display_name: displayName.trim() })
    setNameEditing(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatar.mutateAsync(file)
  }

  if (isLoading) return <SectionShell title="Account"><div className="h-24 animate-pulse bg-muted rounded-lg" /></SectionShell>

  return (
    <SectionShell title="Account">
      {/* Avatar */}
      <div className="flex items-center gap-5 mb-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
          className="relative group shrink-0"
        >
          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="text-muted-foreground" size={32} />
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadAvatar.isPending
              ? <Loader2 size={18} className="text-white animate-spin" />
              : <Camera size={18} className="text-white" />
            }
          </div>
        </button>
        <div>
          <p className="font-medium">{profile?.display_name || 'No name set'}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-primary mt-1 hover:underline"
          >
            Change photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Display name</label>
        {nameEditing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setNameEditing(false) }}
              autoFocus
              className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={updateProfile.isPending}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updateProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setNameEditing(false)}
              className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground flex-1 px-3 py-2 rounded-md bg-muted">
              {profile?.display_name || 'Not set'}
            </span>
            {nameSaved && <Check size={14} className="text-emerald-600 shrink-0" />}
            <button
              type="button"
              onClick={startEditing}
              className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Email (read-only — managed by Supabase Auth) */}
      <div className="space-y-1.5 mt-4">
        <label className="text-sm font-medium">Email</label>
        <p className="text-sm text-muted-foreground px-3 py-2 rounded-md bg-muted">{email}</p>
        <p className="text-xs text-muted-foreground">Email changes are managed in the Security section.</p>
      </div>
    </SectionShell>
  )
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-base mb-5">{title}</h2>
      {children}
    </div>
  )
}
