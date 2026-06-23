'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useUpdateTask, useCreateTask, type TaskWithDeps } from '@/hooks/useTasks'
import { Plus, ZoomIn, ZoomOut } from 'lucide-react'

// ── Layout constants ──────────────────────────────────────────────────────────
const ROW_H        = 56
const HEADER_H     = 48
const HANDLE_W     = 8
const MIN_BAR_DAYS = 1
const MIN_DAY_PX   = 2
const MAX_DAY_PX   = 64
const HISTORY_DAYS = 7 // days before today that rangeStart is set to

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}
function isoToDate(s: string): Date { return new Date(s + 'T00:00:00') }
function dateToIso(d: Date): string { return d.toISOString().split('T')[0] }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// Returns the Monday on or before date d (ISO week boundary)
function getMondayOnOrBefore(d: Date): Date {
  const day = d.getDay() // 0=Sun, 1=Mon, …
  const diff = day === 0 ? -6 : 1 - day
  const r = new Date(d)
  r.setDate(d.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

// ── Bar colours ───────────────────────────────────────────────────────────────
const BAR_COLOUR: Record<string, string> = {
  complete:           'bg-emerald-500/70 border-emerald-600/40',
  in_progress:        'bg-amber-400/85 border-amber-500/40',
  not_started_high:   'bg-red-400/80 border-red-500/40',
  not_started_medium: 'bg-indigo-500/75 border-indigo-600/40',
  not_started_low:    'bg-zinc-400/75 border-zinc-500/40',
}
function barColour(task: TaskWithDeps) {
  if (task.status === 'complete')    return BAR_COLOUR.complete
  if (task.status === 'in_progress') return BAR_COLOUR.in_progress
  return BAR_COLOUR[`not_started_${task.priority ?? 'medium'}`] ?? BAR_COLOUR.not_started_medium
}

// ── Drag types ────────────────────────────────────────────────────────────────
type DragKind = 'move' | 'resize-start' | 'resize-end'
interface DragState  { taskId: string; kind: DragKind; originX: number; origStart: number; origEnd: number }
interface NewBarDrag { anchorDay: number; currentDay: number }
interface Preview    { startDay: number; endDay: number }

// ── Named presets ─────────────────────────────────────────────────────────────
type Grain = 'day' | 'week' | 'month' | 'quarter'
const PRESETS: { label: string; grain: Grain; px: number }[] = [
  { label: 'Day',     grain: 'day',     px: 36 },
  { label: 'Week',    grain: 'week',    px: 14 },
  { label: 'Month',   grain: 'month',   px: 5  },
  { label: 'Quarter', grain: 'quarter', px: 2  },
]

export function GanttView({
  projectId,
  tasks,
  onEditTask,
}: {
  projectId: string
  tasks: TaskWithDeps[]
  onEditTask?: (task: TaskWithDeps) => void
}) {
  const updateTask = useUpdateTask(projectId)
  const createTask = useCreateTask(projectId)
  const scrollRef  = useRef<HTMLDivElement>(null)

  // ── Continuous dayPx state (drives zoom) ──────────────────────────────────
  const [dayPx, setDayPxState] = useState(36)
  const dayPxRef = useRef(36)

  // Stable setter that keeps ref in sync for use inside event handlers
  const setDayPx = useCallback((next: number) => {
    const clamped = clamp(next, MIN_DAY_PX, MAX_DAY_PX)
    dayPxRef.current = clamped
    setDayPxState(clamped)
  }, [])

  // Total canvas days: enough to fill ~3 600 px + history buffer
  const totalDays = useMemo(
    () => Math.max(180, Math.ceil(3600 / dayPx) + HISTORY_DAYS + 30),
    [dayPx],
  )

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  }, [])
  const rangeStart = useMemo(() => addDays(today, -HISTORY_DAYS), [today])
  const todayOff   = HISTORY_DAYS // daysBetween(rangeStart, today) — always constant

  // ── Drag refs ─────────────────────────────────────────────────────────────
  const dragRef    = useRef<DragState | null>(null)
  const newBarRef  = useRef<NewBarDrag | null>(null)
  const previewRef = useRef<Record<string, Preview>>({})

  const [dragState,  setDragState]  = useState<DragState | null>(null)
  const [newBarDrag, setNewBarDrag] = useState<NewBarDrag | null>(null)
  const [preview,    setPreview]    = useState<Record<string, Preview>>({})

  useEffect(() => { dragRef.current    = dragState   }, [dragState])
  useEffect(() => { newBarRef.current  = newBarDrag  }, [newBarDrag])
  useEffect(() => { previewRef.current = preview     }, [preview])

  // ── Quick-create dialog ───────────────────────────────────────────────────
  const [pendingNew, setPendingNew] = useState<{ startDate: string; endDate: string } | null>(null)
  const [newTitle,   setNewTitle]   = useState('')
  const newTitleRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (pendingNew) setTimeout(() => newTitleRef.current?.focus(), 50) }, [pendingNew])

  // ── Bar geometry ──────────────────────────────────────────────────────────
  function taskGeom(task: TaskWithDeps): { startDay: number; endDay: number } {
    const p = previewRef.current[task.id]
    if (p) return p
    const sd = task.start_date
      ? daysBetween(rangeStart, isoToDate(task.start_date))
      : task.created_at
        ? daysBetween(rangeStart, new Date(new Date(task.created_at).setHours(0, 0, 0, 0)))
        : todayOff
    const ed = task.due_date
      ? Math.max(sd + MIN_BAR_DAYS, daysBetween(rangeStart, isoToDate(task.due_date)))
      : sd + 7
    return { startDay: sd, endDay: ed }
  }

  // ── Global mouse events ───────────────────────────────────────────────────
  useEffect(() => {
    function getScrollX() { return scrollRef.current?.scrollLeft ?? 0 }

    function onMove(e: MouseEvent) {
      const px = dayPxRef.current
      const ds = dragRef.current
      if (ds) {
        const rect  = scrollRef.current!.getBoundingClientRect()
        const curX  = e.clientX - rect.left + getScrollX()
        const delta = Math.round((curX - ds.originX) / px)
        let s = ds.origStart, en = ds.origEnd
        if      (ds.kind === 'move')         { s = ds.origStart + delta; en = ds.origEnd + delta }
        else if (ds.kind === 'resize-start') { s  = clamp(ds.origStart + delta, 0, ds.origEnd - MIN_BAR_DAYS) }
        else                                 { en = Math.max(ds.origEnd + delta, ds.origStart + MIN_BAR_DAYS) }
        setPreview(prev => ({ ...prev, [ds.taskId]: { startDay: s, endDay: en } }))
      }
      const nb = newBarRef.current
      if (nb) {
        const rect = scrollRef.current!.getBoundingClientRect()
        const x    = e.clientX - rect.left + getScrollX()
        setNewBarDrag({ ...nb, currentDay: Math.floor(x / px) })
      }
    }

    async function onUp() {
      const ds = dragRef.current
      if (ds) {
        const p = previewRef.current[ds.taskId]
        if (p) {
          await updateTask.mutateAsync({
            taskId:     ds.taskId,
            start_date: dateToIso(addDays(rangeStart, p.startDay)),
            due_date:   dateToIso(addDays(rangeStart, p.endDay)),
          })
        }
        setDragState(null); setPreview({})
      }
      const nb = newBarRef.current
      if (nb) {
        const s = Math.min(nb.anchorDay, nb.currentDay)
        const e = Math.max(nb.anchorDay, nb.currentDay)
        setNewBarDrag(null)
        setPendingNew({
          startDate: dateToIso(addDays(rangeStart, s)),
          endDate:   dateToIso(addDays(rangeStart, Math.max(e, s + 1))),
        })
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Initial scroll: put today at the left edge on mount ───────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = HISTORY_DAYS * 36 // default dayPx
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Pinch / trackpad wheel zoom ───────────────────────────────────────────
  const wheelHandler = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    const el = scrollRef.current
    if (!el) return
    const rect           = el.getBoundingClientRect()
    const cursorX        = e.clientX - rect.left
    const dayUnderCursor = (el.scrollLeft + cursorX) / dayPxRef.current
    const factor         = Math.exp(-e.deltaY / 250)
    const next           = clamp(dayPxRef.current * factor, MIN_DAY_PX, MAX_DAY_PX)
    dayPxRef.current     = next
    setDayPxState(next)
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = Math.max(0, dayUnderCursor * next - cursorX)
      }
    })
  }, [])

  // ── Touch pinch zoom ──────────────────────────────────────────────────────
  const pinchRef = useRef<{ dist: number; baseDayPx: number; midX: number; scrollLeft: number } | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('wheel', wheelHandler, { passive: false })

    function getDist(t: TouchList) {
      const dx = t[0].clientX - t[1].clientX
      const dy = t[0].clientY - t[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
          - el!.getBoundingClientRect().left
        pinchRef.current = {
          dist:      getDist(e.touches),
          baseDayPx: dayPxRef.current,
          midX,
          scrollLeft: el!.scrollLeft,
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinchRef.current) return
      e.preventDefault()
      const scale       = getDist(e.touches) / pinchRef.current.dist
      const next        = clamp(pinchRef.current.baseDayPx * scale, MIN_DAY_PX, MAX_DAY_PX)
      const dayUnderMid = (pinchRef.current.scrollLeft + pinchRef.current.midX) / pinchRef.current.baseDayPx
      dayPxRef.current  = next
      setDayPxState(next)
      requestAnimationFrame(() => {
        if (el) el.scrollLeft = Math.max(0, dayUnderMid * next - pinchRef.current!.midX)
      })
    }

    function onTouchEnd() { pinchRef.current = null }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)

    return () => {
      el.removeEventListener('wheel',      wheelHandler)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [wheelHandler])

  // ── Label grain (derived from continuous dayPx) ───────────────────────────
  const grain: Grain = dayPx >= 25 ? 'day' : dayPx >= 7 ? 'week' : dayPx >= 3 ? 'month' : 'quarter'

  // ── Top labels (month or year spans) ─────────────────────────────────────
  const topLabels = useMemo(() => {
    const out: { label: string; width: number }[] = []
    let day = 0
    if (grain === 'month' || grain === 'quarter') {
      while (day < totalDays) {
        const d    = addDays(rangeStart, day)
        const next = new Date(d.getFullYear() + 1, 0, 1)
        const span = Math.min(totalDays - day, daysBetween(d, next))
        out.push({ label: String(d.getFullYear()), width: span * dayPx })
        day += span
      }
    } else {
      while (day < totalDays) {
        const d    = addDays(rangeStart, day)
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        const span = Math.min(totalDays - day, daysBetween(d, next))
        out.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), width: span * dayPx })
        day += span
      }
    }
    return out
  }, [grain, rangeStart, totalDays, dayPx])

  // ── Bottom labels (day / ISO-week / month / quarter) ─────────────────────
  const bottomLabels = useMemo(() => {
    const out: { day: number; label: string; width: number }[] = []

    if (grain === 'day') {
      for (let d = 0; d < totalDays; d++) {
        out.push({ day: d, label: String(addDays(rangeStart, d).getDate()), width: dayPx })
      }
    } else if (grain === 'week') {
      // ISO calendar weeks — columns always start on Monday
      let monday = getMondayOnOrBefore(rangeStart)
      for (let safety = 0; safety < 600; safety++) {
        const startOff = daysBetween(rangeStart, monday)
        if (startOff >= totalDays) break
        const endOff   = startOff + 7
        const visStart = Math.max(0, startOff)
        const visEnd   = Math.min(totalDays, endOff)
        if (visEnd > 0 && visStart < totalDays) {
          out.push({
            day:   visStart,
            label: `${monday.getMonth() + 1}/${monday.getDate()}`,
            width: (visEnd - visStart) * dayPx,
          })
        }
        monday = addDays(monday, 7)
      }
    } else if (grain === 'month') {
      let day = 0
      while (day < totalDays) {
        const d    = addDays(rangeStart, day)
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        const span = Math.min(totalDays - day, daysBetween(d, next))
        out.push({ day, label: d.toLocaleDateString('en-US', { month: 'short' }), width: span * dayPx })
        day += span
      }
    } else {
      // Quarter
      let day = 0
      while (day < totalDays) {
        const d    = addDays(rangeStart, day)
        const q    = Math.floor(d.getMonth() / 3)
        const next = new Date(d.getFullYear(), (q + 1) * 3, 1)
        const span = Math.min(totalDays - day, daysBetween(d, next))
        out.push({ day, label: `Q${q + 1}`, width: span * dayPx })
        day += span
      }
    }
    return out
  }, [grain, rangeStart, totalDays, dayPx])

  const stripes       = bottomLabels.filter((_, i) => i % 2 === 0)
  const totalWidth    = totalDays * dayPx
  const contentHeight = (tasks.length + 1) * ROW_H + 4
  const isDragging    = dragState !== null || newBarDrag !== null

  // ── Drag helpers ──────────────────────────────────────────────────────────
  function startDrag(e: React.MouseEvent, task: TaskWithDeps, kind: DragKind) {
    e.preventDefault(); e.stopPropagation()
    const g       = taskGeom(task)
    const rect    = scrollRef.current!.getBoundingClientRect()
    const originX = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0)
    setDragState({ taskId: task.id, kind, originX, origStart: g.startDay, origEnd: g.endDay })
  }

  function startNewBar(e: React.MouseEvent) {
    e.preventDefault()
    const rect = scrollRef.current!.getBoundingClientRect()
    const x    = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0)
    setNewBarDrag({ anchorDay: Math.floor(x / dayPx), currentDay: Math.floor(x / dayPx) })
  }

  // ── Snap to preset (keeps visible centre on the same date) ────────────────
  function snapTo(targetPx: number) {
    const el = scrollRef.current
    if (!el) { setDayPx(targetPx); return }
    const centerX        = el.getBoundingClientRect().width / 2
    const dayUnderCenter = (el.scrollLeft + centerX) / dayPxRef.current
    setDayPx(targetPx)
    requestAnimationFrame(() => {
      if (el) el.scrollLeft = Math.max(0, dayUnderCenter * targetPx - centerX)
    })
  }

  return (
    <div className={cn('flex flex-col select-none', isDragging && 'cursor-grabbing')}>

      {/* ── Zoom toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-card">
        <button
          onClick={() => snapTo(clamp(dayPx / 1.5, MIN_DAY_PX, MAX_DAY_PX))}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => snapTo(clamp(dayPx * 1.5, MIN_DAY_PX, MAX_DAY_PX))}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => snapTo(p.px)}
            className={cn(
              'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
              grain === p.grain
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground/40 hidden sm:block pr-1">
          Pinch or ctrl+scroll to zoom
        </span>
      </div>

      {/* ── Scrollable timeline — overflow-auto so sticky header works ──────── */}
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ height: 'calc(100vh - 360px)', minHeight: 400 }}
      >
        <div style={{ width: totalWidth, position: 'relative' }}>

          {/* ── Sticky date header (stays visible while scrolling down) ─────── */}
          <div className="sticky top-0 z-30 bg-card border-b border-border" style={{ height: HEADER_H }}>
            {/* Top row: month / year spans */}
            <div className="flex" style={{ height: 24 }}>
              {topLabels.map((m, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-border/30 flex items-center px-2 overflow-hidden text-[10px] font-medium text-muted-foreground"
                  style={{ width: m.width }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Bottom row: day / week / month / quarter ticks */}
            <div className="flex relative" style={{ height: 24 }}>
              <div
                className="absolute inset-y-0 w-px bg-primary/50 z-10 pointer-events-none"
                style={{ left: todayOff * dayPx }}
              />
              {bottomLabels.map((b, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-border/20 flex items-center px-1 text-[9px] text-muted-foreground/60 overflow-hidden"
                  style={{ width: b.width, ...(i === 0 && b.day > 0 ? { marginLeft: b.day * dayPx } : {}) }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Timeline body ───────────────────────────────────────────────── */}
          <div style={{ position: 'relative', height: contentHeight }}>
            {/* Today line */}
            <div
              className="absolute top-0 w-px bg-primary/20 pointer-events-none z-10"
              style={{ left: todayOff * dayPx, height: contentHeight }}
            />

            {/* Alternating column stripes */}
            {stripes.map((s, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-muted/10 pointer-events-none"
                style={{ left: s.day * dayPx, width: s.width }}
              />
            ))}

            {/* Task bars */}
            {tasks.map((task, rowIdx) => {
              const g              = preview[task.id] ?? taskGeom(task)
              const left           = g.startDay * dayPx
              const width          = Math.max(MIN_BAR_DAYS * dayPx, (g.endDay - g.startDay) * dayPx)
              const top            = rowIdx * ROW_H
              const isThisDragging = dragState?.taskId === task.id

              return (
                <div
                  key={task.id}
                  className="absolute w-full border-b border-border/10"
                  style={{ top, height: ROW_H }}
                >
                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 rounded-md border flex items-center overflow-hidden z-20',
                      barColour(task),
                      task.status === 'complete' && 'opacity-65',
                      isThisDragging && 'ring-2 ring-white/30 shadow-xl z-30',
                      !isThisDragging && 'transition-[left,width] [transition-duration:40ms]',
                      dragState?.kind === 'move' && isThisDragging ? 'cursor-grabbing' : 'cursor-grab',
                    )}
                    style={{ left, width, height: 38 }}
                    onMouseDown={e => startDrag(e, task, 'move')}
                  >
                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 h-full cursor-ew-resize z-10 flex items-center justify-center hover:bg-black/15 transition-colors"
                      style={{ width: HANDLE_W }}
                      onMouseDown={e => startDrag(e, task, 'resize-start')}
                    >
                      <div className="w-0.5 h-3 rounded-full bg-white/50" />
                    </div>

                    {/* Title — click opens edit */}
                    <span
                      className="text-[11px] text-white font-medium truncate flex-1 leading-none cursor-pointer hover:underline underline-offset-2 z-10"
                      style={{ paddingLeft: HANDLE_W + 4, paddingRight: HANDLE_W + 4 }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onEditTask?.(task) }}
                    >
                      {task.title}
                    </span>

                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full cursor-ew-resize z-10 flex items-center justify-center hover:bg-black/15 transition-colors"
                      style={{ width: HANDLE_W }}
                      onMouseDown={e => startDrag(e, task, 'resize-end')}
                    >
                      <div className="w-0.5 h-3 rounded-full bg-white/50" />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* New-bar ghost while dragging to create */}
            {newBarDrag && (() => {
              const s = Math.min(newBarDrag.anchorDay, newBarDrag.currentDay)
              const e = Math.max(newBarDrag.anchorDay, newBarDrag.currentDay)
              return (
                <div
                  className="absolute rounded-md border-2 border-dashed border-primary/60 bg-primary/10 pointer-events-none z-20"
                  style={{
                    left:   s * dayPx,
                    width:  Math.max(dayPx, (e - s + 1) * dayPx),
                    top:    tasks.length * ROW_H + 8,
                    height: 28,
                  }}
                />
              )
            })()}

            {/* Add-task drop zone */}
            <div
              className="absolute w-full border-t border-dashed border-border/40 flex items-center cursor-crosshair hover:bg-accent/20 transition-colors group"
              style={{ top: tasks.length * ROW_H, height: ROW_H }}
              onMouseDown={startNewBar}
            >
              <div className="flex items-center gap-1.5 px-3 text-xs text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors pointer-events-none">
                <Plus size={11} />
                <span>Drag here to add a task</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick-create dialog ────────────────────────────────────────────── */}
      {pendingNew && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => { setPendingNew(null); setNewTitle('') }}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl p-5 w-80 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-semibold">New task</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(pendingNew.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' → '}
                {new Date(pendingNew.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <input
              ref={newTitleRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Escape') { setPendingNew(null); setNewTitle('') }
                if (e.key === 'Enter' && newTitle.trim()) {
                  await createTask.mutateAsync({
                    title:      newTitle.trim(),
                    start_date: pendingNew.startDate,
                    due_date:   pendingNew.endDate,
                    priority:   'medium',
                    sort_order: tasks.length,
                  })
                  setPendingNew(null); setNewTitle('')
                }
              }}
              placeholder="Task name…"
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingNew(null); setNewTitle('') }}
                className="flex-1 py-2 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newTitle.trim()) return
                  await createTask.mutateAsync({
                    title:      newTitle.trim(),
                    start_date: pendingNew.startDate,
                    due_date:   pendingNew.endDate,
                    priority:   'medium',
                    sort_order: tasks.length,
                  })
                  setPendingNew(null); setNewTitle('')
                }}
                disabled={!newTitle.trim() || createTask.isPending}
                className="flex-1 py-2 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {createTask.isPending ? 'Creating…' : 'Create task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
