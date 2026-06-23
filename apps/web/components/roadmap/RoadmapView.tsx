'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useReopenTask,
  useDeleteTask,
  isTaskBlocked,
  type TaskWithDeps,
  type UpdateTaskInput,
  type TaskStatus,
} from '@/hooks/useTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProfile } from '@/hooks/useProfile'
import { useTracks } from '@/hooks/useTracks'
import { useProject } from '@/hooks/useProjects'
import { useCollaborators } from '@/hooks/useCollaborators'
import { AddTaskModal } from './AddTaskModal'
import { TaskItem } from './TaskItem'
import { EditTaskModal } from './EditTaskModal'
import { RoadmapProgressBar } from './RoadmapProgressBar'
import { RoadmapAISummary } from './RoadmapAISummary'
import { GanttView } from './GanttView'
import { Plus, Sparkles, List, BarChart2, Loader2, CheckCircle2, Clock, Circle, Trash2, X, Search, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { FilterDropdown } from '@/components/ui/FilterDropdown'

type ViewMode = 'gantt' | 'list'

export function RoadmapView({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading } = useTasks(projectId)
  const { data: tracks = [] } = useTracks(projectId)
  const { data: project } = useProject(projectId)
  const { data: currentUser } = useCurrentUser()
  const { data: profile } = useProfile(currentUser?.id ?? '')
  const { data: collaborators = [] } = useCollaborators(projectId)

  const createTask   = useCreateTask(projectId)
  const updateTask   = useUpdateTask(projectId)
  const completeTask = useCompleteTask(projectId)
  const reopenTask   = useReopenTask(projectId)
  const deleteTask   = useDeleteTask(projectId)

  const qc = useQueryClient()
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [editingTask,   setEditingTask]   = useState<TaskWithDeps | null>(null)
  const [viewMode,      setViewMode]      = useState<ViewMode>('list')
  const [generatingAI,  setGeneratingAI]  = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [selected,       setSelected]       = useState<Set<string>>(new Set())
  const [searchQuery,    setSearchQuery]    = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const done  = tasks.filter(t => t.status === 'complete').length
  const total = tasks.length

  const hasFilters = !!(searchQuery || statusFilter || priorityFilter || assigneeFilter)

  const filteredTasks = tasks.filter(t => {
    if (searchQuery    && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (statusFilter   && t.status   !== statusFilter)   return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (assigneeFilter) {
      if (assigneeFilter === '__unassigned__') {
        if (t.assignee_id) return false
      } else {
        if (t.assignee_id !== assigneeFilter) return false
      }
    }
    return true
  })

  const lastSelectedIndexRef = useRef<number>(-1)

  function toggleSelect(id: string, index: number, shiftKey: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (shiftKey && lastSelectedIndexRef.current !== -1) {
        const lo = Math.min(lastSelectedIndexRef.current, index)
        const hi = Math.max(lastSelectedIndexRef.current, index)
        const adding = !prev.has(id)
        sortedTasks.slice(lo, hi + 1).forEach(t => adding ? next.add(t.id) : next.delete(t.id))
      } else {
        next.has(id) ? next.delete(id) : next.add(id)
        lastSelectedIndexRef.current = index
      }
      return next
    })
  }

  function clearSelection() { setSelected(new Set()) }

  const selectedTasks  = tasks.filter(t => selected.has(t.id))
  const allComplete    = selectedTasks.length > 0 && selectedTasks.every(t => t.status === 'complete')

  // Sort list view tasks: start_date ASC (nulls last), then due_date ASC (nulls last), then sort_order
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const sd = (a.start_date ?? '￿').localeCompare(b.start_date ?? '￿')
    if (sd !== 0) return sd
    const dd = (a.due_date ?? '￿').localeCompare(b.due_date ?? '￿')
    if (dd !== 0) return dd
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  async function bulkSetStatus(status: TaskStatus) {
    if (!currentUser) return
    await Promise.all(selectedTasks.map(t => {
      if (status === 'complete')    return completeTask.mutateAsync({ taskId: t.id, userId: currentUser.id })
      if (status === 'not_started') return reopenTask.mutateAsync(t.id)
      return updateTask.mutateAsync({ taskId: t.id, status })
    }))
    clearSelection()
  }

  async function bulkDelete() {
    await Promise.all([...selected].map(id => deleteTask.mutateAsync(id)))
    clearSelection()
  }

  async function handleTaskUpdate(task: TaskWithDeps, updates: Omit<UpdateTaskInput, 'taskId'>) {
    const prevAssignee = task.assignee_id
    await updateTask.mutateAsync({ taskId: task.id, ...updates })

    if (updates.assignee_id && updates.assignee_id !== prevAssignee) {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-notify-assignment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ projectId, taskIds: [task.id] }),
        }).catch(() => {})
      }
    }
  }

  async function handleGenerateWithAI() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    setGeneratingAI(true)
    setGenerateError(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-generate-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setGenerateError(body.error ?? `Error ${res.status}`)
      } else {
        await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      }
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setGeneratingAI(false)
    }
  }

  async function handleAutoAssign() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    setAutoAssigning(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId }),
      })
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    } catch (e) {
      console.warn('Auto-assign failed:', e)
    } finally {
      setAutoAssigning(false)
    }
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

  const displayName = (profile as { full_name?: string | null; display_name?: string | null } | undefined)?.full_name
    ?? (profile as { full_name?: string | null; display_name?: string | null } | undefined)?.display_name
    ?? currentUser?.user_metadata?.full_name
    ?? currentUser?.user_metadata?.display_name
    ?? currentUser?.email?.split('@')[0]
    ?? 'there'
  const anySelected = selected.size > 0

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-24 sm:pb-8 max-w-5xl mx-auto space-y-4">
      {project && (
        <RoadmapAISummary
          projectId={projectId}
          project={{ title: project.title, project_type: project.project_type }}
          tasks={tasks}
          tracks={tracks}
          displayName={displayName}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {total > 0 && (
          <div className="flex-1 min-w-[180px]">
            <RoadmapProgressBar done={done} total={total} />
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition-colors whitespace-nowrap"
            title="Add task"
          >
            <Plus size={13} />
            Add Task
          </button>

          <button
            onClick={handleGenerateWithAI}
            disabled={generatingAI}
            title="Create tasks with AI"
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingAI ? 'Generating…' : 'Create with AI'}
          </button>

          {tasks.length > 0 && (
            <button
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              title="Auto-assign existing tasks to collaborators based on their roles"
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {autoAssigning ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
              <span className="sm:hidden">{autoAssigning ? 'Assigning…' : 'Auto Assign'}</span>
              <span className="hidden sm:inline">{autoAssigning ? 'Assigning…' : 'Auto-assign'}</span>
            </button>
          )}

          {generateError && (
            <span className="text-xs text-destructive max-w-[200px] truncate" title={generateError}>
              {generateError}
            </span>
          )}

          <div className="hidden sm:flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="List view"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors border-l border-border',
                viewMode === 'gantt' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              title="Timeline view"
            >
              <BarChart2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Search + filters — 1 row on desktop, 2 rows on mobile */}
      {tasks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Row 1: search + view toggle (toggle visible on mobile only) */}
          <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex sm:hidden rounded-md border border-border overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-2.5 py-1.5 text-xs flex items-center transition-colors',
                  viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                title="List view"
              >
                <List size={13} />
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={cn(
                  'px-2.5 py-1.5 text-xs flex items-center transition-colors border-l border-border',
                  viewMode === 'gantt' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                title="Timeline view"
              >
                <BarChart2 size={13} />
              </button>
            </div>
          </div>

          {/* Row 2 on mobile: filters fill full width equally */}
          <div className="flex items-center gap-2 sm:contents">
            <FilterDropdown
              className="flex-1 sm:flex-none"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'not_started', label: 'Not started', dot: 'bg-gray-400' },
                { value: 'in_progress',  label: 'In progress',  dot: 'bg-blue-500' },
                { value: 'complete',     label: 'Complete',     dot: 'bg-teal-500' },
              ]}
            />

            <FilterDropdown
              className="flex-1 sm:flex-none"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: '',       label: 'All priorities' },
                { value: 'high',   label: 'High',   dot: 'bg-red-500' },
                { value: 'medium', label: 'Medium', dot: 'bg-amber-500' },
                { value: 'low',    label: 'Low',    dot: 'bg-slate-400' },
              ]}
            />

            <FilterDropdown
              className="flex-1 sm:flex-none"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: '', label: 'All assignees' },
                { value: '__unassigned__', label: 'Unassigned' },
                ...collaborators.map(c => ({
                  value: c.user_id,
                  label: (c as { full_name?: string | null }).full_name ?? c.display_name ?? c.user_id.slice(0, 8),
                })),
              ]}
            />

            {hasFilters && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter(''); setPriorityFilter(''); setAssigneeFilter('') }}
                className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground rounded-md border border-border hover:bg-accent transition-colors"
                title="Clear filters"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}

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
              {generatingAI ? 'Generating…' : 'Create tasks with AI'}
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <>
          {filteredTasks.length === 0 && hasFilters && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No tasks match your filters.
            </p>
          )}

          <div className="space-y-1.5">
            {sortedTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                allTasks={tasks}
                isBlocked={isTaskBlocked(task, tasks)}
                selected={selected.has(task.id)}
                onToggleSelect={(e) => toggleSelect(task.id, index, e?.shiftKey ?? false)}
                onEdit={() => setEditingTask(task)}
              />
            ))}
          </div>

          {/* Bulk action bar — mobile: full-width bottom bar */}
          {anySelected && (
            <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-2xl flex items-center gap-1.5 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <span className="text-sm font-semibold shrink-0 min-w-0">{selected.size} sel.</span>
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                {allComplete ? (
                  <button
                    onClick={() => bulkSetStatus('not_started')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-xs font-medium"
                  >
                    <Circle size={16} />
                    Undo
                  </button>
                ) : (
                  <button
                    onClick={() => bulkSetStatus('complete')}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                  >
                    <CheckCircle2 size={16} />
                    Done
                  </button>
                )}
                <button
                  onClick={() => bulkSetStatus('in_progress')}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-amber-400/10 text-amber-600 hover:bg-amber-400/20 transition-colors text-xs font-medium"
                >
                  <Clock size={16} />
                  Progress
                </button>
                <button
                  onClick={bulkDelete}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
              <button
                onClick={clearSelection}
                className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Bulk action bar — desktop: floating pill */}
          {anySelected && (
            <div className="hidden sm:flex fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-full shadow-2xl">
              <span className="text-xs text-muted-foreground font-medium px-1.5">
                {selected.size} selected
              </span>
              <div className="w-px h-4 bg-border mx-1" />
              {allComplete ? (
                <button
                  onClick={() => bulkSetStatus('not_started')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
                >
                  <Circle size={12} />
                  Mark incomplete
                </button>
              ) : (
                <button
                  onClick={() => bulkSetStatus('complete')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors font-medium"
                >
                  <CheckCircle2 size={12} />
                  Mark complete
                </button>
              )}
              <button
                onClick={() => bulkSetStatus('in_progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-amber-400/10 text-amber-600 hover:bg-amber-400/20 transition-colors font-medium"
              >
                <Clock size={12} />
                In progress
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
              >
                <Trash2 size={12} />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-colors ml-1"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <GanttView projectId={projectId} tasks={sortedTasks} onEditTask={setEditingTask} />
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

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          collaborators={collaborators}
          onSave={(updates) => handleTaskUpdate(editingTask, updates)}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}
