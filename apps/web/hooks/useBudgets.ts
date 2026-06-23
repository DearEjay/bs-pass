'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

export type Budget = Database['public']['Tables']['budgets']['Row']
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update']
export type LineItem = Database['public']['Tables']['budget_line_items']['Row']
export type LineItemInsert = Database['public']['Tables']['budget_line_items']['Insert']
export type LineItemUpdate = Database['public']['Tables']['budget_line_items']['Update']

// ── Budget queries ──────────────────────────────────────────────────────────

export function useBudgets(userId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['budgets', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, projects(id, title)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useBudget(budgetId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['budget', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, projects(id, title, project_type)')
        .eq('id', budgetId)
        .is('deleted_at', null)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!budgetId,
  })
}

export function useBudgetForProject(projectId: string | null) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['budget-for-project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, title')
        .eq('project_id', projectId!)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

// ── Budget mutations ────────────────────────────────────────────────────────

export function useCreateBudget(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<BudgetInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...payload, user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', userId] }),
  })
}

export function useUpdateBudget(budgetId: string, userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: BudgetUpdate) => {
      const { error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', budgetId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget', budgetId] })
      qc.invalidateQueries({ queryKey: ['budgets', userId] })
    },
  })
}

export function useDeleteBudget(userId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('budgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', budgetId)
      if (error) throw error
    },
    onSuccess: (_data, budgetId) => {
      qc.invalidateQueries({ queryKey: ['budgets', userId] })
      qc.removeQueries({ queryKey: ['budget', budgetId] })
    },
  })
}

// ── Line item queries ───────────────────────────────────────────────────────

export function useBudgetLineItems(budgetId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['budget-line-items', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .eq('budget_id', budgetId)
        .order('category')
        .order('sort_order')
      if (error) throw error
      return data
    },
    enabled: !!budgetId,
  })
}

// ── Line item mutations ─────────────────────────────────────────────────────

export function useUpsertLineItems(budgetId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: LineItemInsert[]) => {
      const { error } = await supabase
        .from('budget_line_items')
        .upsert(items, { onConflict: 'id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-line-items', budgetId] }),
  })
}

export function useUpdateLineItem(budgetId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & LineItemUpdate) => {
      const { error } = await supabase
        .from('budget_line_items')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-line-items', budgetId] }),
  })
}

export function useAddLineItem(budgetId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Omit<LineItemInsert, 'budget_id'>) => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .insert({ ...item, budget_id: budgetId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-line-items', budgetId] }),
  })
}

export function useDeleteLineItem(budgetId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_line_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-line-items', budgetId] }),
  })
}
