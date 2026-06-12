import { createClient } from '@/lib/supabase/server'
import { AccountSection } from '@/components/profile/AccountSection'
import { NotificationSection } from '@/components/profile/NotificationSection'
import { PublishingInfoSection } from '@/components/profile/PublishingInfoSection'
import { SecuritySection } from '@/components/profile/SecuritySection'
import { BackButton } from '@/components/ui/BackButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-8">
          <BackButton fallback="/projects" />
          <h1 className="text-xl font-semibold">Profile & Settings</h1>
        </div>

        <div className="space-y-4">
          <AccountSection userId={user.id} email={user.email ?? ''} />
          <PublishingInfoSection userId={user.id} />
          <NotificationSection userId={user.id} />
          <SecuritySection email={user.email ?? ''} />
        </div>
      </div>
    </div>
  )
}
