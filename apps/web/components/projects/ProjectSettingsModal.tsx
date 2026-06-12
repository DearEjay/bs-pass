'use client'

import { useState, useRef } from 'react'
import { useUpdateProject, useDeleteProject, useUploadProjectCover } from '@/hooks/useProjects'
import { useRouter } from 'next/navigation'
import { X, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AgentSection } from '@/components/profile/AgentSection'
import { AgentPluginsSection } from '@/components/profile/AgentPluginsSection'
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
  const uploadCover = useUploadProjectCover(project.id)
  const deleteProject = useDeleteProject(userId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(project.title)
  const [projectType, setProjectType] = useState(project.project_type as typeof PROJECT_TYPES[number]['value'])
  const [genre, setGenre] = useState(project.genre ?? '')
  const [agentMode, setAgentMode] = useState(project.agent_mode as typeof AGENT_MODES[number]['value'])
  const [confirmDelete, setConfirmDelete] = useState(false)

  // null = removed, undefined = unchanged, string = local preview URL, existing = project.cover_url
  const [coverFile, setCoverFile] = useState<File | null | undefined>(undefined)
  const [coverPreview, setCoverPreview] = useState<string | null>(project.cover_url ?? null)

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function removeCover() {
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateProject.mutateAsync({
      title,
      project_type: projectType,
      genre: genre || null,
      agent_mode: agentMode,
    })
    // Upload new cover or clear it if explicitly removed
    if (coverFile !== undefined) {
      await uploadCover.mutateAsync(coverFile)
    }
    onClose()
  }

  async function handleDelete() {
    await deleteProject.mutateAsync(project.id)
    router.push('/projects')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold">Project settings</h2>
          <button onClick={onClose} className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 pt-5 pb-5 space-y-4">
          {/* Cover art */}
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full aspect-[2/1] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden group',
                coverPreview
                  ? 'border-transparent'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground bg-muted/40',
              )}
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm">
                    <ImagePlus size={16} />
                    Change artwork
                  </div>
                </>
              ) : (
                <>
                  <ImagePlus size={22} />
                  <span className="text-sm">Add cover art</span>
                </>
              )}
            </button>
            {coverPreview && (
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleCoverChange}
          />

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
        <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4 border-t border-border pt-5">
          <AgentSection userId={userId} />
          <AgentPluginsSection userId={userId} />
        </div>
      </div>
    </div>
  )
}
