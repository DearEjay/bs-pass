'use client'

import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in_pre_production', label: 'Pre-Production' },
  { value: 'in_production', label: 'In Production' },
  { value: 'in_post_production', label: 'Post-Production' },
  { value: 'ready_for_release', label: 'Ready' },
  { value: 'released', label: 'Released' },
] as const

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
  { value: 'mixtape', label: 'Mixtape' },
] as const

export function ProjectList({ userId }: { userId: string }) {
  const { data: projects, isLoading, error } = useProjects(userId)
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!projects) return []
    return projects.filter(p => {
      const matchesQuery = query.trim() === '' || p.title.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      const matchesType = typeFilter === 'all' || p.project_type === typeFilter
      return matchesQuery && matchesStatus && matchesType
    })
  }, [projects, query, statusFilter, typeFilter])

  const hasActiveFilter = query || statusFilter !== 'all' || typeFilter !== 'all'

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
      {/* Search + filters */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-9 py-2 rounded-md bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs border transition-colors',
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {f.label}
            </button>
          ))}

          <div className="w-px bg-border self-stretch mx-1" />

          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs border transition-colors',
                typeFilter === f.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {f.label}
            </button>
          ))}

          {hasActiveFilter && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all') }}
              className="px-3 py-1 rounded-full text-xs border border-destructive/40 text-destructive hover:bg-destructive/5 transition-colors ml-auto"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {!hasActiveFilter && (
          <button
            onClick={() => setShowNew(true)}
            className="bg-card border border-dashed border-border rounded-lg aspect-[3/4] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:border-primary/60 transition-colors">
              <Plus size={20} />
            </div>
            <span className="text-sm font-medium">New project</span>
          </button>
        )}

        {filtered.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
            No projects match your filters.
          </div>
        )}
      </div>

      {showNew && (
        <NewProjectModal userId={userId} onClose={() => setShowNew(false)} />
      )}
    </>
  )
}
