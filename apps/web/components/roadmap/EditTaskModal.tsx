'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { TaskWithDeps, Priority, TaskStatus, UpdateTaskInput } from '@/hooks/useTasks'
import type { Collaborator } from '@/hooks/useCollaborators'

const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete',    label: 'Complete' },
]

interface Props {
  task: TaskWithDeps
  collaborators: Collaborator[]
  onSave: (updates: Omit<UpdateTaskInput, 'taskId'>) => void
  onClose: () => void
}

export function EditTaskModal({ task, collaborators, onSave, onClose }: Props) {
  const [title,       setTitle]       = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority,    setPriority]    = useState<Priority>((task.priority as Priority) ?? 'medium')
  const [status,      setStatus]      = useState<TaskStatus>(task.status as TaskStatus)
  const [startDate,   setStartDate]   = useState(task.start_date ?? '')
  const [dueDate,     setDueDate]     = useState(task.due_date ?? '')
  const [assigneeId,  setAssigneeId]  = useState(task.assignee_id ?? '')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      title:       title.trim(),
      description: description.trim() || null,
      priority,
      status,
      start_date:  startDate || null,
      due_date:    dueDate   || null,
      assignee_id: assigneeId || null,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[85svh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-sm font-semibold">Edit task</h2>
          <button onClick={onClose} className="p-2 -mr-1 text-muted-foreground hover:text-foreground rounded-md transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">

        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Title</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Optional details…"
          />
        </div>

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assignee */}
        {collaborators.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Assign to</label>
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Unassigned</option>
              {collaborators.map(c => (
                <option key={c.user_id} value={c.user_id}>
                  {(c as { full_name?: string | null }).full_name ?? c.display_name ?? c.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start + Due date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-2 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Save changes
          </button>
        </div>

        </div>
      </div>
    </div>
  )
}
