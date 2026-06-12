import { createClient } from '@/lib/supabase/server'
import { ProjectList } from '@/components/projects/ProjectList'
import { UserButton } from '@/components/shared/UserButton'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-8 max-w-5xl mx-auto pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user!.id} />
          <UserButton userId={user!.id} />
        </div>
      </div>
      <ProjectList userId={user!.id} />
      <CommandPalette userId={user!.id} />
      <OnboardingModal userId={user!.id} />
    </div>
  )
}
