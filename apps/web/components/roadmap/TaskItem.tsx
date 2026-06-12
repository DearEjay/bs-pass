'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskWithDeps, Priority } from '@/hooks/useTasks'

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  high:   { label: 'High',   dot: 'bg-red-400' },
  medium: { label: 'Medium', dot: 'bg-amber-400' },
  low:    { label: 'Low',    dot: 'bg-zinc-400' },
}

const STATUS_LABEL: Record<string, string> = {
  complete:    'Complete',
  in_progress: 'In progress',
  not_started: 'Not started',
}

interface Props {
  task: TaskWithDeps
  allTasks: TaskWithDeps[]
  isBlocked: boolean
  selected: boolean
  onToggleSelect: () => void
  onEdit?: () => void
}

export function TaskItem({ task, allTasks, isBlocked, selected, onToggleSelect, onEdit }: Props) {
  const isDone   = task.status === 'complete'
  const priority = (task.priority as Priority) ?? 'medium'

  const blockerTitles = task.dependencies
    .map(depId => allTasks.find(t => t.id === depId))
    .filter((t): t is TaskWithDeps => !!t && t.status !== 'complete')
    .map(t => t.title)

  function fmt(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg border bg-card transition-colors',
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border hover:bg-accent/30',
        isDone && 'opacity-60',
      )}
    >
      {/* Checkbox — clicking this selects the row */}
      <button
        onClick={onToggleSelect}
        className={cn(
          'shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors',
          selected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-border hover:border-primary/50',
        )}
        aria-label={selected ? 'Deselect task' : 'Select task'}
      >
        {selected && <Check size={10} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        {onEdit ? (
          <button
            onClick={onEdit}
            className={cn(
              'text-sm leading-snug text-left hover:underline hover:text-primary transition-colors w-full',
              isDone && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </button>
        ) : (
          <p className={cn('text-sm leading-snug', isDone && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            task.status === 'complete'    && 'bg-emerald-500/10 text-emerald-600',
            task.status === 'in_progress' && 'bg-amber-400/15 text-amber-600',
            task.status === 'not_started' && 'bg-muted text-muted-foreground',
          )}>
            {STATUS_LABEL[task.status] ?? task.status}
          </span>

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_CONFIG[priority].dot)} />
            {PRIORITY_CONFIG[priority].label}
          </span>

          {(task.start_date || task.due_date) && (
            <span className="text-xs text-muted-foreground">
              {task.start_date ? fmt(task.start_date) : '—'}
              {' → '}
              {task.due_date ? fmt(task.due_date) : '—'}
            </span>
          )}

          {isBlocked && (
            <span className="text-xs text-destructive font-medium">
              Blocked by {blockerTitles.length} task{blockerTitles.length > 1 ? 's' : ''}
            </span>
          )}

          {task.created_by === 'agent' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">AI</span>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}
      </div>
    </div>
  )
}
