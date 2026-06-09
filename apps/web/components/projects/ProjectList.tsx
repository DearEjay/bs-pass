'use client'

import { useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { Plus } from 'lucide-react'

export function ProjectList({ userId }: { userId: string }) {
  const { data: projects, isLoading, error } = useProjects(userId)
  const [showNew, setShowNew] = useState(false)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg aspect-[3/4] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm">{(error as Error).message}</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setShowNew(true)}
          className="bg-card border border-dashed border-border rounded-lg aspect-[3/4] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors group"
        >
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:border-primary/60 transition-colors">
            <Plus size={20} />
          </div>
          <span className="text-sm font-medium">New project</span>
        </button>

        {projects?.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {showNew && (
        <NewProjectModal userId={userId} onClose={() => setShowNew(false)} />
      )}
    </>
  )
}
