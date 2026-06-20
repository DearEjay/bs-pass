import { createClient } from '@/lib/supabase/server'
import { BudgetListClient } from '@/components/budgets/BudgetListClient'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { UserButton } from '@/components/shared/UserButton'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Plan and track your music project spending</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user!.id} />
          <UserButton userId={user!.id} />
        </div>
      </div>
      <BudgetListClient userId={user!.id} />
    </div>
  )
}
