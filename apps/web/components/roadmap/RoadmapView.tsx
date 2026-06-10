'use client'

import { useState } from 'react'
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
  type Priority,
} from '@/hooks/useTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { AddTaskModal } from './AddTaskModal'
import { TaskItem } from './TaskItem'
import { RoadmapProgressBar } from './RoadmapProgressBar'
import { Plus } from 'lucide-react'

export function RoadmapView({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading } = useTasks(projectId)
  const { data: currentUser } = useCurrentUser()

  const createTask = useCreateTask(projectId)
  const updateTask = useUpdateTask(projectId)
  const completeTask = useCompleteTask(projectId)
  const reopenTask = useReopenTask(projectId)
  const deleteTask = useDeleteTask(projectId)
  const reorderTask = useReorderTask(projectId)

  const [showAddModal, setShowAddModal] = useState(false)

  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Progress bar */}
      {total > 0 && <RoadmapProgressBar done={done} total={total} />}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm space-y-3">
          <p>No tasks yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={13} />
            Add first task
          </button>
        </div>
      ) : (
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
      )}

      {/* Add task button (when tasks exist) */}
      {tasks.length > 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
        >
          <Plus size={14} />
          Add task
        </button>
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
