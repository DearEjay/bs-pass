import { createClient } from '@/lib/supabase/server'
import { ProjectList } from '@/components/projects/ProjectList'
import { UserButton } from '@/components/shared/UserButton'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <UserButton userId={user!.id} />
      </div>
      <ProjectList userId={user!.id} />
    </div>
  )
}
