'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useUpdateTask } from '@/hooks/useTasks'
import type { TaskWithDeps, Priority } from '@/hooks/useTasks'

const DAY_PX = 24
const LABEL_W = 200

const PRIORITY_BAR: Record<Priority, string> = {
  high: 'bg-red-400/80 border-red-500/50',
  medium: 'bg-primary/70 border-primary/50',
  low: 'bg-zinc-400/70 border-zinc-500/50',
}

const STATUS_BAR: Record<string, string> = {
  complete: 'bg-emerald-500/70 border-emerald-600/50',
  in_progress: 'bg-amber-400/70 border-amber-500/50',
  not_started: '',
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function isoToDate(s: string) {
  return new Date(s + 'T00:00:00')
}

function getMonthHeaders(start: Date, totalDays: number) {
  const months: { label: string; days: number }[] = []
  let cur = new Date(start.getFullYear(), start.getMonth(), 1)
  let offset = daysBetween(start, cur)
  if (offset < 0) cur = new Date(start.getFullYear(), start.getMonth(), start.getDate()); // start IS first month

  while (daysBetween(start, cur) < totalDays) {
    const monthStart = Math.max(0, daysBetween(start, cur))
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    const monthEnd = Math.min(totalDays, daysBetween(start, nextMonth))
    months.push({
      label: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      days: monthEnd - monthStart,
    })
    cur = nextMonth
  }
  return months
}

interface EditPopover {
  taskId: string
  title: string
  due_date: string
  x: number
  y: number
}

export function GanttView({ projectId, tasks }: { projectId: string; tasks: TaskWithDeps[] }) {
  const updateTask = useUpdateTask(projectId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [popover, setPopover] = useState<EditPopover | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDate, setDraftDate] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Timeline range: 2 weeks before today → 10 weeks after last due date (or 12 weeks)
  const allDueDates = tasks
    .map(t => t.due_date ? isoToDate(t.due_date) : null)
    .filter(Boolean) as Date[]
  const latestDue = allDueDates.length > 0 ? new Date(Math.max(...allDueDates.map(d => d.getTime()))) : addDays(today, 60)
  const rangeStart = addDays(today, -14)
  const rangeEnd = addDays(latestDue, 21)
  const totalDays = Math.max(90, daysBetween(rangeStart, rangeEnd))

  const todayOffset = daysBetween(rangeStart, today)
  const months = getMonthHeaders(rangeStart, totalDays)

  function openPopover(task: TaskWithDeps, e: React.MouseEvent) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover({
      taskId: task.id,
      title: task.title,
      due_date: task.due_date ?? '',
      x: rect.left,
      y: rect.bottom + 8,
    })
    setDraftTitle(task.title)
    setDraftDate(task.due_date ?? '')
  }

  async function savePopover() {
    if (!popover) return
    await updateTask.mutateAsync({
      taskId: popover.taskId,
      title: draftTitle.trim() || popover.title,
      due_date: draftDate || null,
    })
    setPopover(null)
  }

  return (
    <div className="relative flex flex-col overflow-hidden" onClick={() => setPopover(null)}>
      {/* Fixed left label column + scrollable timeline */}
      <div className="flex overflow-hidden">
        {/* Left: task names */}
        <div className="shrink-0 border-r border-border" style={{ width: LABEL_W }}>
          {/* Header spacer */}
          <div className="h-10 border-b border-border px-3 flex items-center">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task</span>
          </div>
          {tasks.map(task => (
            <div
              key={task.id}
              className="h-10 border-b border-border/50 px-3 flex items-center gap-2"
            >
              <span className={cn(
                'text-xs truncate',
                task.status === 'complete' && 'line-through text-muted-foreground',
              )}>
                {task.title}
              </span>
            </div>
          ))}
        </div>

        {/* Right: scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div style={{ width: totalDays * DAY_PX, minWidth: '100%' }}>
            {/* Month headers */}
            <div className="flex h-5 border-b border-border/50">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="shrink-0 flex items-center px-1 border-r border-border/30 text-[10px] text-muted-foreground overflow-hidden"
                  style={{ width: m.days * DAY_PX }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Day number row */}
            <div className="flex h-5 border-b border-border relative">
              {/* Today line in header */}
              <div
                className="absolute top-0 bottom-0 w-px bg-primary/60 z-10"
                style={{ left: todayOffset * DAY_PX }}
              />
              {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, weekIdx) => {
                const d = addDays(rangeStart, weekIdx * 7)
                return (
                  <div
                    key={weekIdx}
                    className="shrink-0 flex items-center px-1 border-r border-border/20 text-[9px] text-muted-foreground/60"
                    style={{ width: 7 * DAY_PX }}
                  >
                    {d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  </div>
                )
              })}
            </div>

            {/* Task rows */}
            {tasks.map(task => {
              // Bar from created_at to due_date; fallback to a 1-week bar at today
              const barStart = task.created_at
                ? Math.max(0, daysBetween(rangeStart, new Date(task.created_at)))
                : todayOffset
              const barEnd = task.due_date
                ? Math.max(barStart + 1, daysBetween(rangeStart, isoToDate(task.due_date)) + 1)
                : barStart + 7
              const barWidth = Math.max(DAY_PX, (barEnd - barStart) * DAY_PX)
              const barLeft = barStart * DAY_PX

              const statusClass = STATUS_BAR[task.status] || PRIORITY_BAR[(task.priority as Priority) ?? 'medium']

              return (
                <div key={task.id} className="relative h-10 border-b border-border/30 flex items-center">
                  {/* Weekend shading (every 7th pair) */}
                  {/* Today column highlight */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary/20"
                    style={{ left: todayOffset * DAY_PX }}
                  />

                  {/* Bar */}
                  <button
                    onClick={e => openPopover(task, e)}
                    className={cn(
                      'absolute h-6 rounded border cursor-pointer hover:brightness-110 transition-all',
                      task.status === 'complete' ? STATUS_BAR.complete : (STATUS_BAR[task.status] || PRIORITY_BAR[(task.priority as Priority) ?? 'medium']),
                      task.status === 'complete' && 'opacity-60',
                    )}
                    style={{ left: barLeft, width: barWidth }}
                    title={`${task.title}${task.due_date ? ` — due ${task.due_date}` : ''}`}
                  >
                    <span className="px-1.5 text-[10px] font-medium text-white/90 truncate block leading-6">
                      {task.title}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Edit popover */}
      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-3 w-64 space-y-2"
            style={{ left: Math.min(popover.x, window.innerWidth - 280), top: popover.y }}
            onClick={e => e.stopPropagation()}
          >
            <input
              autoFocus
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-input border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Task title"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0">Due</label>
              <input
                type="date"
                value={draftDate}
                onChange={e => setDraftDate(e.target.value)}
                className="flex-1 px-2 py-1.5 text-sm bg-input border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPopover(null)}
                className="flex-1 py-1 text-xs border border-border rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePopover}
                disabled={updateTask.isPending}
                className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
