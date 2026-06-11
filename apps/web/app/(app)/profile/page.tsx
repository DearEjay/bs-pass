import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AccountSection } from '@/components/profile/AccountSection'
import { NotificationSection } from '@/components/profile/NotificationSection'
import { AgentSection } from '@/components/profile/AgentSection'
import { AgentPluginsSection } from '@/components/profile/AgentPluginsSection'
import { SecuritySection } from '@/components/profile/SecuritySection'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold">Profile & Settings</h1>
        </div>

        <div className="space-y-4">
          <AccountSection userId={user.id} email={user.email ?? ''} />
          <NotificationSection userId={user.id} />
          <AgentSection userId={user.id} />
          <AgentPluginsSection userId={user.id} />
          <SecuritySection email={user.email ?? ''} />
        </div>
      </div>
    </div>
  )
}
