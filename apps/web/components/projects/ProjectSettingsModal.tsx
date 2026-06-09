'use client'

import { useState } from 'react'
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

const PROJECT_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
  { value: 'mixtape', label: 'Mixtape' },
] as const
const AGENT_MODES = [
  { value: 'minimal', label: 'Minimal', desc: 'Only when asked' },
  { value: 'moderate', label: 'Moderate', desc: 'On key events' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Always active' },
] as const

export function ProjectSettingsModal({
  project,
  userId,
  onClose,
}: {
  project: Project
  userId: string
  onClose: () => void
}) {
  const router = useRouter()
  const updateProject = useUpdateProject(project.id)
  const deleteProject = useDeleteProject(userId)

  const [title, setTitle] = useState(project.title)
  const [projectType, setProjectType] = useState(project.project_type as typeof PROJECT_TYPES[number]['value'])
  const [genre, setGenre] = useState(project.genre ?? '')
  const [agentMode, setAgentMode] = useState(project.agent_mode as typeof AGENT_MODES[number]['value'])
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateProject.mutateAsync({
      title,
      project_type: projectType,
      genre: genre || null,
      agent_mode: agentMode,
    })
    onClose()
  }

  async function handleDelete() {
    await deleteProject.mutateAsync(project.id)
    router.push('/projects')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold">Project settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
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
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
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
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">AI Agent mode</label>
            <div className="space-y-2">
              {AGENT_MODES.map(mode => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setAgentMode(mode.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-md border text-sm transition-colors',
                    agentMode === mode.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80',
                  )}
                >
                  <span className={agentMode === mode.value ? 'text-primary font-medium' : 'text-foreground'}>
                    {mode.label}
                  </span>
                  <span className="text-muted-foreground text-xs">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {updateProject.error && (
            <p className="text-destructive text-sm">{(updateProject.error as Error).message}</p>
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
              disabled={updateProject.isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {updateProject.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div className="border-t border-border pt-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors"
              >
                Delete project
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">This cannot be undone. Are you sure?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteProject.isPending}
                    className="flex-1 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {deleteProject.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
