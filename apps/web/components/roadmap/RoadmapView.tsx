'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
  useReorderTask,
  isTaskBlocked,
  type TaskWithDeps,
} from '@/hooks/useTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTracks } from '@/hooks/useTracks'
import { useProject } from '@/hooks/useProjects'
import { AddTaskModal } from './AddTaskModal'
import { TaskItem } from './TaskItem'
import { RoadmapProgressBar } from './RoadmapProgressBar'
import { RoadmapAISummary } from './RoadmapAISummary'
import { GanttView } from './GanttView'
import { Plus, Sparkles, List, BarChart2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type ViewMode = 'list' | 'gantt'

export function RoadmapView({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading } = useTasks(projectId)
  const { data: tracks = [] } = useTracks(projectId)
  const { data: project } = useProject(projectId)
  const { data: currentUser } = useCurrentUser()

  const createTask = useCreateTask(projectId)
  const updateTask = useUpdateTask(projectId)
  const completeTask = useCompleteTask(projectId)
  const reopenTask = useReopenTask(projectId)
  const deleteTask = useDeleteTask(projectId)
  const reorderTask = useReorderTask(projectId)

  const qc = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [generatingAI, setGeneratingAI] = useState(false)

  const done = tasks.filter(t => t.status === 'complete').length
  const total = tasks.length

  async function handleGenerateWithAI() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    setGeneratingAI(true)
    try {
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-generate-roadmap`
      await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ projectId }),
      })
      // Re-fetch tasks after generation
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    } finally {
      setGeneratingAI(false)
    }
  }

  async function handleMoveUp(task: TaskWithDeps, index: number) {
    if (index === 0) return
    const above = tasks[index - 1]
    await Promise.all([
      reorderTask.mutateAsync({ taskId: task.id, newSortOrder: above.sort_order ?? index - 1 }),
      reorderTask.mutateAsync({ taskId: above.id, newSortOrder: task.sort_order ?? index }),
    ])
  }

  async function handleMoveDown(task: TaskWithDeps, index: number) {
    if (index === tasks.length - 1) return
    const below = tasks[index + 1]
    await Promise.all([
      reorderTask.mutateAsync({ taskId: task.id, newSortOrder: below.sort_order ?? index + 1 }),
      reorderTask.mutateAsync({ taskId: below.id, newSortOrder: task.sort_order ?? index }),
    ])
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  const displayName = currentUser?.user_metadata?.display_name ?? currentUser?.email?.split('@')[0] ?? 'there'

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      {/* AI summary banner */}
      {project && (
        <RoadmapAISummary
          project={{ title: project.title, project_type: project.project_type }}
          tasks={tasks}
          tracks={tracks}
          displayName={displayName}
        />
      )}

      {/* Toolbar row: progress + view switcher + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Progress */}
        {total > 0 && (
          <div className="flex-1 min-w-[180px]">
            <RoadmapProgressBar done={done} total={total} />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* AI generate button */}
          <button
            onClick={handleGenerateWithAI}
            disabled={generatingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 disabled:opacity-50 transition-colors"
            title="Generate tasks with AI"
          >
            {generatingAI ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {generatingAI ? 'Generating…' : 'Generate with AI'}
          </button>

          {/* View switcher */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="List view"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors border-l border-border',
                viewMode === 'gantt'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Timeline view"
            >
              <BarChart2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm space-y-3">
          <p>No tasks yet. Add one manually or let the AI generate a roadmap.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent transition-colors"
            >
              <Plus size={13} />
              Add task
            </button>
            <button
              onClick={handleGenerateWithAI}
              disabled={generatingAI}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {generatingAI ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {generatingAI ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <>
          <div className="space-y-1.5">
            {tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                allTasks={tasks}
                isBlocked={isTaskBlocked(task, tasks)}
                isFirst={index === 0}
                isLast={index === tasks.length - 1}
                onComplete={() => currentUser && completeTask.mutate({ taskId: task.id, userId: currentUser.id })}
                onReopen={() => reopenTask.mutate(task.id)}
                onDelete={() => deleteTask.mutate(task.id)}
                onMoveUp={() => handleMoveUp(task, index)}
                onMoveDown={() => handleMoveDown(task, index)}
                onUpdate={(updates) => updateTask.mutate({ taskId: task.id, ...updates })}
              />
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
          >
            <Plus size={14} />
            Add task
          </button>
        </>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <GanttView projectId={projectId} tasks={tasks} />
        </div>
      )}

      {showAddModal && (
        <AddTaskModal
          projectId={projectId}
          defaultSortOrder={tasks.length}
          onCreate={async (input) => {
            await createTask.mutateAsync(input)
            setShowAddModal(false)
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
