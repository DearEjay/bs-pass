'use client'

import { useState } from 'react'
import { useCreateProject } from '@/hooks/useProjects'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROJECT_TYPES = ['single', 'ep', 'album', 'mixtape'] as const
const BUDGET_LEVELS = [
  { value: 'indie', label: 'Indie' },
  { value: 'independent', label: 'Independent' },
  { value: 'mid_level', label: 'Mid-Level' },
  { value: 'major', label: 'Major' },
] as const

export function NewProjectModal({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const createProject = useCreateProject(userId)
  const [title, setTitle] = useState('')
  const [projectType, setProjectType] = useState<typeof PROJECT_TYPES[number]>('single')
  const [genre, setGenre] = useState('')
  const [budgetLevel, setBudgetLevel] = useState('')
  const [timelineStart, setTimelineStart] = useState('')
  const [timelineEnd, setTimelineEnd] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createProject.mutateAsync({
      title,
      project_type: projectType,
      genre: genre || null,
      budget_level: budgetLevel || null,
      timeline_start: timelineStart || null,
      timeline_end: timelineEnd || null,
      agent_mode: 'moderate',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">New project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Summer EP"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {PROJECT_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProjectType(type)}
                  className={cn(
                    'py-1.5 rounded-md text-sm border capitalize transition-colors',
                    projectType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Genre <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              value={genre}
              onChange={e => setGenre(e.target.value)}
              placeholder="e.g. Hip-Hop, R&B"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start date <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="date"
                value={timelineStart}
                onChange={e => setTimelineStart(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End date <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="date"
                value={timelineEnd}
                onChange={e => setTimelineEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {createProject.error && (
            <p className="text-destructive text-sm">{(createProject.error as Error).message}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProject.isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
