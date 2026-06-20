import { createClient } from '@/lib/supabase/server'
import { BudgetWizard } from '@/components/budgets/BudgetWizard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewBudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-24 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/budgets"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create a Budget</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered allocation in 5 steps</p>
        </div>
      </div>

      <BudgetWizard userId={user!.id} />
    </div>
  )
}
