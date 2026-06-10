'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, MoreHorizontal, CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskWithDeps, Priority } from '@/hooks/useTasks'

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  high: { label: 'High', dot: 'bg-red-400' },
  medium: { label: 'Medium', dot: 'bg-amber-400' },
  low: { label: 'Low', dot: 'bg-zinc-400' },
}

const STATUS_ICON = {
  done: <CheckCircle2 size={16} className="text-primary shrink-0" />,
  in_progress: <Clock size={16} className="text-amber-400 shrink-0" />,
  blocked: <AlertCircle size={16} className="text-destructive shrink-0" />,
  todo: <Circle size={16} className="text-muted-foreground shrink-0" />,
}

interface Props {
  task: TaskWithDeps
  allTasks: TaskWithDeps[]
  isBlocked: boolean
  isFirst: boolean
  isLast: boolean
  onComplete: () => void
  onReopen: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (updates: { title?: string; description?: string | null; priority?: Priority; due_date?: string | null }) => void
}

export function TaskItem({
  task,
  allTasks,
  isBlocked,
  isFirst,
  isLast,
  onComplete,
  onReopen,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isDone = task.status === 'done'
  const effectiveStatus = isBlocked && !isDone ? 'blocked' : task.status as keyof typeof STATUS_ICON
  const priority = (task.priority as Priority) ?? 'medium'

  const blockerTitles = task.dependencies
    .map(depId => allTasks.find(t => t.id === depId))
    .filter((t): t is TaskWithDeps => !!t && t.status !== 'done')
    .map(t => t.title)

  function startEdit() {
    setTitleDraft(task.title)
    setEditing(true)
    setShowMenu(false)
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed })
  }

  function handleToggle() {
    if (isBlocked) return
    if (isDone) onReopen()
    else onComplete()
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-3 rounded-lg border border-border bg-card transition-opacity',
        isDone && 'opacity-60',
      )}
    >
      {/* Status toggle */}
      <button
        onClick={handleToggle}
        disabled={isBlocked}
        className="mt-0.5 shrink-0 disabled:cursor-not-allowed"
        title={isBlocked ? `Blocked by: ${blockerTitles.join(', ')}` : isDone ? 'Mark as incomplete' : 'Mark as done'}
      >
        {STATUS_ICON[effectiveStatus] ?? STATUS_ICON.todo}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full text-sm bg-transparent border-b border-primary outline-none pb-px"
          />
        ) : (
          <p
            onClick={startEdit}
            className={cn(
              'text-sm cursor-text leading-snug',
              isDone && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Priority dot */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_CONFIG[priority].dot)} />
            {PRIORITY_CONFIG[priority].label}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span className="text-xs text-muted-foreground">
              Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}

          {/* Blocked indicator */}
          {isBlocked && (
            <span className="text-xs text-destructive font-medium">
              Blocked by {blockerTitles.length} task{blockerTitles.length > 1 ? 's' : ''}
            </span>
          )}

          {/* Dependency count */}
          {task.dependencies.length > 0 && !isBlocked && (
            <span className="text-xs text-muted-foreground/60">
              {task.dependencies.length} dep{task.dependencies.length > 1 ? 's' : ''}
            </span>
          )}

          {/* Created by agent badge */}
          {task.created_by === 'agent' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              AI
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}
      </div>

      {/* Actions — reorder + menu */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move up"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move down"
        >
          <ChevronDown size={13} />
        </button>

        {/* Ellipsis menu */}
        <div className="relative">
          <button
            onClick={() => { setShowMenu(v => !v); setConfirmDelete(false) }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
          >
            <MoreHorizontal size={13} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden text-xs">
                <button
                  onClick={startEdit}
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                >
                  Rename
                </button>
                <div className="border-t border-border my-1" />
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete task
                  </button>
                ) : (
                  <div className="px-3 py-2 space-y-1.5">
                    <p className="text-muted-foreground">Delete this task?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-1 border border-border rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onDelete() }}
                        className="flex-1 py-1 border border-destructive/30 text-destructive rounded hover:bg-destructive/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
