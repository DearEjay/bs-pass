'use client'

import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { Plus, Search, X } from 'lucide-react'
import { FilterDropdown } from '@/components/ui/FilterDropdown'

const STATUS_FILTERS = [
  { value: 'all',                label: 'All statuses' },
  { value: 'in_pre_production',  label: 'Pre-Production',  dot: 'bg-gray-400' },
  { value: 'in_production',      label: 'In Production',   dot: 'bg-orange-500' },
  { value: 'in_post_production', label: 'Post-Production', dot: 'bg-blue-500' },
  { value: 'ready_for_release',  label: 'Ready',           dot: 'bg-violet-500' },
  { value: 'released',           label: 'Released',        dot: 'bg-teal-600' },
]

const TYPE_FILTERS = [
  { value: 'all',      label: 'All types' },
  { value: 'single',   label: 'Single',   dot: 'bg-indigo-500' },
  { value: 'ep',       label: 'EP',       dot: 'bg-purple-500' },
  { value: 'album',    label: 'Album',    dot: 'bg-pink-500' },
  { value: 'mixtape',  label: 'Mixtape',  dot: 'bg-cyan-500' },
]

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
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <FilterDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_FILTERS}
        />

        <FilterDropdown
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_FILTERS}
        />

        {hasActiveFilter && (
          <button
            onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all') }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md border border-border hover:bg-accent transition-colors"
          >
            <X size={11} />
            Clear
          </button>
        )}
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
