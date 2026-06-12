'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface Split {
  id: string
  track_id: string
  collaborator_id: string
  percentage: number
  role: string | null
  split_status: 'pending' | 'signed' | 'voided'
  signed_at: string | null
  signed_ip: string | null
  signature_token: string | null
  token_expires_at: string | null
  created_at: string | null
  collaborator: {
    id: string
    user_id: string
    display_name: string | null
    full_name: string | null
    pro_name: string | null
    ipi_number: string | null
    avatar_url: string | null
    roles: string[]
    is_main_artist: boolean
  }
}

export interface SplitAuditEntry {
  id: string
  action: string
  actor_type: string
  diff: Record<string, unknown>
  created_at: string
}

export function useSplits(trackId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['splits', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('splits')
        .select(`
          id,
          track_id,
          collaborator_id,
          percentage,
          role,
          split_status,
          signed_at,
          signed_ip,
          signature_token,
          token_expires_at,
          created_at,
          collaborators!inner(
            id,
            user_id,
            roles,
            is_main_artist,
            profiles:user_id(display_name, full_name, pro_name, ipi_number, avatar_url)
          )
        `)
        .eq('track_id', trackId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(s => {
        const c = s.collaborators as {
          id: string
          user_id: string
          roles: string[]
          is_main_artist: boolean
          profiles: {
            display_name: string | null
            full_name?: string | null
            pro_name?: string | null
            ipi_number?: string | null
            avatar_url: string | null
          } | null
        }
        return {
          id: s.id,
          track_id: s.track_id,
          collaborator_id: s.collaborator_id,
          percentage: Number(s.percentage),
          role: s.role ?? null,
          split_status: (s.split_status ?? 'pending') as 'pending' | 'signed' | 'voided',
          signed_at: s.signed_at ?? null,
          signed_ip: s.signed_ip ?? null,
          signature_token: s.signature_token ?? null,
          token_expires_at: s.token_expires_at ?? null,
          created_at: s.created_at ?? null,
          collaborator: {
            id: c.id,
            user_id: c.user_id,
            display_name: c.profiles?.display_name ?? null,
            full_name: c.profiles?.full_name ?? c.profiles?.display_name ?? null,
            pro_name: c.profiles?.pro_name ?? null,
            ipi_number: c.profiles?.ipi_number ?? null,
            avatar_url: c.profiles?.avatar_url ?? null,
            roles: Array.isArray(c.roles) ? c.roles : [],
            is_main_artist: c.is_main_artist ?? false,
          },
        } as Split
      })
    },
    enabled: !!trackId,
    staleTime: 15_000,
  })
}

export function useTrackSplitsLock(trackId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['track_splits_lock', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('splits_agent_locked')
        .eq('id', trackId)
        .single()
      if (error) throw error
      return data?.splits_agent_locked ?? false
    },
    enabled: !!trackId,
  })
}

export function useUpsertSplits(trackId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (splits: Array<{ collaborator_id: string; percentage: number; role?: string }>) => {
      const supabase = createClient()

      // 100% validation (exact to 2 decimal places)
      const total = splits.reduce((s, x) => s + Number(x.percentage), 0)
      if (Math.round(total * 100) !== 10000) {
        throw new Error(`Splits must total 100% (currently ${total.toFixed(2)}%)`)
      }

      // Check if any splits currently have active signature requests
      const { data: existing } = await supabase
        .from('splits')
        .select('id,split_status,signature_token,collaborator_id,percentage,role')
        .eq('track_id', trackId)

      const hadActiveTokens = (existing ?? []).some(s => s.signature_token !== null && s.split_status !== 'voided')

      // Delete old splits
      const { error: delError } = await supabase.from('splits').delete().eq('track_id', trackId)
      if (delError) throw delError

      // Insert new splits; rollback to previous state if insert fails
      const { error: insError } = await supabase.from('splits').insert(
        splits.map(s => ({
          track_id: trackId,
          collaborator_id: s.collaborator_id,
          percentage: s.percentage,
          role: s.role ?? null,
          split_status: 'pending',
        }))
      )
      if (insError) {
        if (existing && existing.length > 0) {
          try {
            await supabase.from('splits').insert(
              existing.map(s => ({
                track_id: trackId,
                collaborator_id: s.collaborator_id,
                percentage: s.percentage,
                role: s.role,
                split_status: s.split_status,
              }))
            )
          } catch { /* ignore rollback failure — best effort */ }
        }
        throw insError
      }

      // Lock agent for this track since there was a manual edit
      await supabase.from('tracks').update({ splits_agent_locked: true }).eq('id', trackId)

      // Audit log
      await supabase.from('audit_logs').insert({
        project_id: projectId,
        actor_type: 'user',
        entity_type: 'splits',
        entity_id: trackId,
        action: hadActiveTokens ? 'splits_changed_signatures_voided' : 'splits_updated',
        diff: { splits, had_active_tokens: hadActiveTokens },
      })

      return { voided: hadActiveTokens }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['splits', trackId] })
      qc.invalidateQueries({ queryKey: ['track_splits_lock', trackId] })
      qc.invalidateQueries({ queryKey: ['split_audit', trackId] })
    },
  })
}

export function useAutoPopulateSplits(trackId: string, projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()

      // Load track credits
      const { data: credits } = await supabase
        .from('track_credits')
        .select('name, role')
        .eq('track_id', trackId)
        .order('sort_order', { ascending: true })

      if (!credits || credits.length === 0) {
        throw new Error('No track credits found. Add credits in the Tracks tab first.')
      }

      // Load collaborators with profiles
      const { data: track } = await supabase
        .from('tracks')
        .select('project_id')
        .eq('id', trackId)
        .single()

      const { data: collabs } = await supabase
        .from('collaborators')
        .select('id, user_id, roles, profiles:user_id(display_name, full_name)')
        .eq('project_id', track?.project_id ?? projectId)
        .is('removed_at', null)

      // Match credits to collaborators by full_name or display_name (case-insensitive)
      const matched: Array<{ collaborator_id: string; percentage: number }> = []
      const matchedCollabIds = new Set<string>()

      for (const credit of credits) {
        const name = credit.name?.trim().toLowerCase()
        if (!name) continue
        const collab = (collabs ?? []).find(c => {
          const p = c.profiles as { display_name: string | null; full_name?: string | null } | null
          const cn = (p?.full_name ?? p?.display_name)?.trim().toLowerCase()
          return cn === name
        })
        if (collab && !matchedCollabIds.has(collab.id)) {
          matchedCollabIds.add(collab.id)
          matched.push({ collaborator_id: collab.id, percentage: 0 })
        }
      }

      if (matched.length === 0) {
        throw new Error('No credits matched to collaborators. Make sure credit names match collaborator full names.')
      }

      // Equal distribution (last row absorbs rounding)
      const pct = parseFloat((100 / matched.length).toFixed(2))
      const splits = matched.map((m, i) => ({
        ...m,
        percentage: i === matched.length - 1
          ? parseFloat((100 - pct * (matched.length - 1)).toFixed(2))
          : pct,
      }))

      // Read existing splits for rollback if insert fails
      const { data: existingSplits } = await supabase
        .from('splits')
        .select('collaborator_id, percentage, role, split_status')
        .eq('track_id', trackId)

      const { error: delError } = await supabase.from('splits').delete().eq('track_id', trackId)
      if (delError) throw delError

      const { error } = await supabase.from('splits').insert(
        splits.map(s => ({
          track_id: trackId,
          collaborator_id: s.collaborator_id,
          percentage: s.percentage,
          split_status: 'pending',
        }))
      )
      if (error) {
        if (existingSplits && existingSplits.length > 0) {
          try {
            await supabase.from('splits').insert(
              existingSplits.map(s => ({ track_id: trackId, ...s }))
            )
          } catch { /* ignore rollback failure — best effort */ }
        }
        throw error
      }

      await supabase.from('audit_logs').insert({
        project_id: projectId,
        actor_type: 'user',
        entity_type: 'splits',
        entity_id: trackId,
        action: 'splits_auto_populated',
        diff: { splits, credit_count: credits.length },
      })

      return splits
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['splits', trackId] })
      qc.invalidateQueries({ queryKey: ['split_audit', trackId] })
    },
  })
}

export function useResetSplitsLock(trackId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('tracks')
        .update({ splits_agent_locked: false })
        .eq('id', trackId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['track_splits_lock', trackId] })
    },
  })
}

export function useRequestSignatures(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (trackId: string) => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/splits-request-signatures`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ trackId }),
        }
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      return body
    },
    onSuccess: (_, trackId) => {
      qc.invalidateQueries({ queryKey: ['splits', trackId] })
      qc.invalidateQueries({ queryKey: ['split_audit', trackId] })
    },
  })
}

export function useSplitAuditLog(trackId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['split_audit', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id,action,actor_type,diff,created_at')
        .eq('entity_type', 'splits')
        .eq('entity_id', trackId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as SplitAuditEntry[]
    },
    enabled: !!trackId,
    staleTime: 30_000,
  })
}

async function callGeneratePdf(trackId: string): Promise<Response> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/splits-generate-pdf`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ trackId }),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }

  return res
}

export function useGeneratePdf(projectId: string) {
  return useMutation({
    mutationFn: async (trackId: string) => {
      const res = await callGeneratePdf(trackId)

      // Trigger browser download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? 'splits-agreement.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    },
  })
}

export function useEmailPdf(projectId: string) {
  return useMutation({
    mutationFn: async (trackId: string) => {
      const res = await callGeneratePdf(trackId)
      await res.body?.cancel() // drain without downloading
      return { success: true }
    },
  })
}
