'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutGrid, LogOut, User, WalletMinimal } from 'lucide-react'

function clearLocalCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('bs-pass:roadmap-summary:'))
      .forEach(k => localStorage.removeItem(k))
  } catch {}
}

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Clear roadmap summary cache on any sign-out (manual, forced, or token expiry)
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearLocalCache()
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    clearLocalCache()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const onProjects = pathname.startsWith('/projects')
  const onBudgets  = pathname.startsWith('/budgets')
  const onProfile  = pathname.startsWith('/profile')

  return (
    <>
      {/* ── Desktop sidebar (md+) ───────────────────────────── */}
      <nav className="hidden md:flex w-56 h-screen flex-col border-r border-border bg-card px-3 py-4 shrink-0">
        <div className="mb-6 px-2">
          <span className="text-lg font-bold tracking-tight">BS-PASS</span>
        </div>

        <div className="flex-1 space-y-1">
          <Link
            href="/projects"
            className={cn(
              'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
              onProjects
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <LayoutGrid size={16} />
            Projects
          </Link>

          <Link
            href="/budgets"
            className={cn(
              'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
              onBudgets
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <WalletMinimal size={16} />
            Budgets
          </Link>

          <Link
            href="/profile"
            className={cn(
              'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
              onProfile
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <User size={16} />
            Profile
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

      {/* ── Mobile bottom nav (<md) ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-center justify-around px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/projects"
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1 rounded-md text-xs transition-colors',
            onProjects ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <LayoutGrid size={22} />
          <span>Projects</span>
        </Link>

        <Link
          href="/budgets"
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1 rounded-md text-xs transition-colors',
            onBudgets ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <WalletMinimal size={22} />
          <span>Budgets</span>
        </Link>

        <Link
          href="/profile"
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1 rounded-md text-xs transition-colors',
            onProfile ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <User size={22} />
          <span>Profile</span>
        </Link>
      </nav>
    </>
  )
}
