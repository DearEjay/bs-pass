import { createClient } from '@/lib/supabase/server'
import { BudgetDetail } from '@/components/budgets/BudgetDetail'

export default async function BudgetPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <BudgetDetail budgetId={params.id} userId={user!.id} />
}
