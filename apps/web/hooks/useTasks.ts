'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type Priority = 'high' | 'medium' | 'low'
type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export type { Task, TaskStatus, Priority }

export interface TaskWithDeps extends Task {
  dependencies: string[] // depends_on_id values
  dependents: string[]  // task_ids that depend on this task
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTasks(projectId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const [{ data: tasks, error }, { data: deps }] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('task_dependencies')
          .select('task_id, depends_on_id')
          .in(
            'task_id',
            // subquery workaround: we'll filter in-memory after
            [] as string[], // placeholder — we fetch all then filter
          ),
      ])
      if (error) throw error

      // Fetch deps separately (simpler than a subquery)
      const taskIds = (tasks ?? []).map(t => t.id)
      let depRows: { task_id: string; depends_on_id: string }[] = []
      if (taskIds.length > 0) {
        const { data: d } = await supabase
          .from('task_dependencies')
          .select('task_id, depends_on_id')
          .in('task_id', taskIds)
        depRows = d ?? []
      }

      const dependenciesMap: Record<string, string[]> = {}
      const dependentsMap: Record<string, string[]> = {}
      for (const d of depRows) {
        dependenciesMap[d.task_id] = [...(dependenciesMap[d.task_id] ?? []), d.depends_on_id]
        dependentsMap[d.depends_on_id] = [...(dependentsMap[d.depends_on_id] ?? []), d.task_id]
      }

      return (tasks ?? []).map(t => ({
        ...t,
        dependencies: dependenciesMap[t.id] ?? [],
        dependents: dependentsMap[t.id] ?? [],
      })) as TaskWithDeps[]
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

interface NewTaskInput {
  title: string
  description?: string | null
  priority?: Priority
  due_date?: string | null
  assignee_id?: string | null
  sort_order?: number
}

export function useCreateTask(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? 'medium',
          due_date: input.due_date ?? null,
          assignee_id: input.assignee_id ?? null,
          sort_order: input.sort_order ?? 0,
          created_by: 'user',
        })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

// ── Update ────────────────────────────────────────────────────────────────────

interface UpdateTaskInput {
  taskId: string
  title?: string
  description?: string | null
  priority?: Priority
  due_date?: string | null
  assignee_id?: string | null
  sort_order?: number
}

export function useUpdateTask(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, ...updates }: UpdateTaskInput) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

// ── Complete / reopen ─────────────────────────────────────────────────────────

export function useCompleteTask(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

export function useReopenTask(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'todo', completed_at: null, completed_by: null })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

// ── Soft delete ───────────────────────────────────────────────────────────────

export function useDeleteTask(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

// ── Reorder (swap sort_order) ─────────────────────────────────────────────────

export function useReorderTask(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, newSortOrder }: { taskId: string; newSortOrder: number }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ sort_order: newSortOrder })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

// ── Dependencies ──────────────────────────────────────────────────────────────

export function useAddDependency(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .insert({ task_id: taskId, depends_on_id: dependsOnId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

export function useRemoveDependency(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', taskId)
        .eq('depends_on_id', dependsOnId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  })
}

// ── Helper: is a task blocked (has incomplete dependencies)? ──────────────────

export function isTaskBlocked(task: TaskWithDeps, allTasks: TaskWithDeps[]): boolean {
  if (task.dependencies.length === 0) return false
  return task.dependencies.some(depId => {
    const dep = allTasks.find(t => t.id === depId)
    return dep ? dep.status !== 'done' : false
  })
}
