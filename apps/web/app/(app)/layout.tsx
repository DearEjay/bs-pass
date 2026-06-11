import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/ui/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <AppShell>
      <div className="h-[100dvh] overflow-hidden">
        <main className="h-full overflow-y-auto overscroll-none">
          {children}
        </main>
      </div>
    </AppShell>
  )
}
