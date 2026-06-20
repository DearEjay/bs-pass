import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/ui/AppShell'
import { AppNav } from '@/components/shared/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <AppShell>
      <div className="flex h-[100dvh] overflow-hidden">
        <AppNav />
        <main className="flex-1 h-full overflow-y-auto overscroll-none pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </AppShell>
  )
}
