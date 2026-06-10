import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/projects/ProjectHeader'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!project) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader project={project} userId={user!.id} />
      <div className="flex-1 overflow-y-auto overscroll-none pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  )
}
