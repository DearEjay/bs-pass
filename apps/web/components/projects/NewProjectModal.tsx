'use client'

import { useState } from 'react'
import { useCreateProject } from '@/hooks/useProjects'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROJECT_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
  { value: 'mixtape', label: 'Mixtape' },
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
  const [projectType, setProjectType] = useState<typeof PROJECT_TYPES[number]['value']>('single')
  const [budgetLevel, setBudgetLevel] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createProject.mutateAsync({
      title,
      project_type: projectType,
      budget_level: budgetLevel || null,
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
              autoFocus
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {PROJECT_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProjectType(value)}
                  className={cn(
                    'py-1.5 rounded-md text-sm border transition-colors',
                    projectType === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
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
