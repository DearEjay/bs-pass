'use client'

import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from './ProjectCard'
import { NewProjectModal } from './NewProjectModal'
import { Plus, Search, X, LayoutGrid, List } from 'lucide-react'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

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

const STATUS_LABEL: Record<string, string> = {
  in_pre_production: 'Pre-Production',
  in_production: 'In Production',
  in_post_production: 'Post-Production',
  ready_for_release: 'Ready for Release',
  released: 'Released',
}

const STATUS_COLOR: Record<string, string> = {
  in_pre_production: 'text-muted-foreground border-border',
  in_production: 'text-blue-600 border-blue-200 bg-blue-50',
  in_post_production: 'text-orange-600 border-orange-200 bg-orange-50',
  ready_for_release: 'text-sky-600 border-sky-200 bg-sky-50',
  released: 'text-violet-600 border-violet-200 bg-violet-50',
}

const TYPE_LABEL: Record<string, string> = {
  album: 'Album', ep: 'EP', single: 'Single', mixtape: 'Mixtape',
}

function ProjectListRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}/roadmap`}
      className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-accent/50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary shrink-0 flex items-center justify-center">
        {project.cover_url
          ? <img src={project.cover_url} alt={project.title} className="w-full h-full object-cover" />
          : <span className="text-lg">🎵</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{project.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {TYPE_LABEL[project.project_type] ?? project.project_type}
          {project.genre ? ` · ${project.genre}` : ''}
        </p>
      </div>

      <span className={cn(
        'text-xs px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0',
        STATUS_COLOR[project.status] ?? 'text-muted-foreground border-border',
      )}>
        {STATUS_LABEL[project.status] ?? project.status}
      </span>
    </Link>
  )
}

export function ProjectList({ userId }: { userId: string }) {
  const { data: projects, isLoading, error } = useProjects(userId)
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [myProjectsOnly, setMyProjectsOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() => {
    if (!projects) return []
    return projects.filter(p => {
      const matchesQuery = query.trim() === '' || p.title.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      const matchesType = typeFilter === 'all' || p.project_type === typeFilter
      const matchesMine = !myProjectsOnly || (p as Project & { owner_id?: string }).owner_id === userId
      return matchesQuery && matchesStatus && matchesType && matchesMine
    })
  }, [projects, query, statusFilter, typeFilter, myProjectsOnly, userId])

  const hasActiveFilter = query || statusFilter !== 'all' || typeFilter !== 'all' || myProjectsOnly

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
      <div className="space-y-2 mb-5">
        {/* Search + view switcher — always on the same line */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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

          <div className="flex rounded-md border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="Grid view"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center transition-colors border-l border-border',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="List view"
            >
              <List size={13} />
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            onClick={() => setMyProjectsOnly(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap',
              myProjectsOnly
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            My projects
          </button>

          {hasActiveFilter && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all'); setMyProjectsOnly(false) }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md border border-border hover:bg-accent transition-colors"
            >
              <X size={11} />
              Clear
            </button>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
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
      ) : (
        <div className="space-y-2">
          {!hasActiveFilter && (
            <button
              onClick={() => setShowNew(true)}
              className="w-full flex items-center gap-4 px-4 py-3 bg-card border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-md border-2 border-dashed border-current flex items-center justify-center shrink-0 group-hover:border-primary/60 transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-sm font-medium">New project</span>
            </button>
          )}

          {filtered.map(project => (
            <ProjectListRow key={project.id} project={project} />
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No projects match your filters.
            </div>
          )}
        </div>
      )}

      {showNew && (
        <NewProjectModal userId={userId} onClose={() => setShowNew(false)} />
      )}
    </>
  )
}
