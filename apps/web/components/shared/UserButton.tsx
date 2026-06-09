'use client'

import Link from 'next/link'
import { User } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'

export function UserButton({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId)

  return (
    <Link
      href="/profile"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={12} className="text-muted-foreground" />
        )}
      </div>
      <span className="hidden sm:inline max-w-[120px] truncate">
        {profile?.display_name ?? 'Profile'}
      </span>
    </Link>
  )
}
