'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutGrid, LogOut } from 'lucide-react'

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="w-56 h-screen flex flex-col border-r border-border bg-card px-3 py-4 shrink-0">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold tracking-tight">BS-PASS</span>
      </div>

      <div className="flex-1 space-y-1">
        <Link
          href="/projects"
          className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
            pathname.startsWith('/projects')
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          )}
        >
          <LayoutGrid size={16} />
          Projects
        </Link>
      </div>

      <button
        onClick={signOut}
        className="flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </nav>
  )
}
