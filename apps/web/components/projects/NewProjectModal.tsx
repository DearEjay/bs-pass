'use client'

import { useState, useRef } from 'react'
import { useCreateProject } from '@/hooks/useProjects'
import { createClient } from '@/lib/supabase/client'
import { X, ImagePlus } from 'lucide-react'
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
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    onClose()
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function removeCover() {
    setCoverFile(null)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const project = await createProject.mutateAsync({
      title,
      project_type: projectType,
      budget_level: budgetLevel || null,
      agent_mode: 'moderate',
      coverFile: coverFile ?? undefined,
    })
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    onClose()

    // Fire-and-forget: let the agent generate a roadmap in the background
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-generate-roadmap`
      fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ projectId: project.id }),
      }).catch(() => { /* silent — background job */ })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="font-semibold">New project</h2>
          <button onClick={handleClose} disabled={createProject.isPending} className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">
          {/* Cover art */}
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full aspect-[2/1] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden',
                coverPreview
                  ? 'border-transparent'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground bg-muted/40',
              )}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
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
              onClick={handleClose}
              disabled={createProject.isPending}
              className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
