'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'
import { useCollaborators } from './useCollaborators'

export type Resource = 'tracks' | 'stems' | 'splits' | 'tasks' | 'assets' | 'chat'
export type PermLevel = 'none' | 'view' | 'edit' | 'full'

export const RESOURCES: Resource[] = ['tracks', 'stems', 'splits', 'tasks', 'assets', 'chat']

export const RESOURCE_LABELS: Record<Resource, string> = {
  tracks: 'Tracks', stems: 'Stems', splits: 'Splits',
  tasks: 'Tasks', assets: 'Assets', chat: 'Chat',
}

export const COLLAB_ROLES = [
  'producer', 'co_producer', 'recording_engineer', 'mixing_engineer',
  'mastering_engineer', 'songwriter', 'featured_artist', 'session_musician',
  'background_vocalist', 'manager', 'ar', 'graphic_designer',
  'video_director', 'marketing',
] as const

export const ROLE_LABELS: Record<string, string> = {
  producer: 'Producer', co_producer: 'Co-Producer',
  recording_engineer: 'Recording Engineer', mixing_engineer: 'Mixing Engineer',
  mastering_engineer: 'Mastering Engineer', songwriter: 'Songwriter',
  featured_artist: 'Featured Artist', session_musician: 'Session Musician',
  background_vocalist: 'Background Vocalist', manager: 'Manager',
  ar: 'A&R', graphic_designer: 'Graphic Designer',
  video_director: 'Video Director', marketing: 'Marketing',
}

// Principled defaults — least privilege; escalate only where the role clearly needs it
export const DEFAULT_PERMISSIONS: Record<string, Record<Resource, PermLevel>> = {
  producer:           { tracks: 'full', stems: 'full',  splits: 'view', tasks: 'full', assets: 'full', chat: 'full' },
  co_producer:        { tracks: 'edit', stems: 'edit',  splits: 'none', tasks: 'edit', assets: 'edit', chat: 'full' },
  recording_engineer: { tracks: 'edit', stems: 'edit',  splits: 'none', tasks: 'view', assets: 'view', chat: 'full' },
  mixing_engineer:    { tracks: 'view', stems: 'full',  splits: 'none', tasks: 'view', assets: 'view', chat: 'full' },
  mastering_engineer: { tracks: 'view', stems: 'view',  splits: 'none', tasks: 'view', assets: 'view', chat: 'full' },
  songwriter:         { tracks: 'view', stems: 'none',  splits: 'view', tasks: 'edit', assets: 'view', chat: 'full' },
  featured_artist:    { tracks: 'none', stems: 'none',  splits: 'view', tasks: 'none', assets: 'none', chat: 'edit' },
  session_musician:   { tracks: 'none', stems: 'none',  splits: 'view', tasks: 'none', assets: 'none', chat: 'full' },
  background_vocalist:{ tracks: 'none', stems: 'none',  splits: 'view', tasks: 'none', assets: 'none', chat: 'full' },
  manager:            { tracks: 'view', stems: 'view',  splits: 'view', tasks: 'edit', assets: 'full', chat: 'full' },
  ar:                 { tracks: 'view', stems: 'none',  splits: 'view', tasks: 'view', assets: 'full', chat: 'full' },
  graphic_designer:   { tracks: 'none', stems: 'none',  splits: 'none', tasks: 'view', assets: 'edit', chat: 'full' },
  video_director:     { tracks: 'none', stems: 'none',  splits: 'none', tasks: 'view', assets: 'edit', chat: 'full' },
  marketing:          { tracks: 'none', stems: 'none',  splits: 'none', tasks: 'view', assets: 'edit', chat: 'full' },
}

function rowToLevel(can_view: boolean, can_edit: boolean, can_delete: boolean): PermLevel {
  if (can_delete) return 'full'
  if (can_edit)   return 'edit'
  if (can_view)   return 'view'
  return 'none'
}

function levelToFlags(level: PermLevel) {
  return {
    can_view:   level !== 'none',
    can_edit:   level === 'edit' || level === 'full',
    can_delete: level === 'full',
  }
}

export type PermMatrix = Record<string, Record<Resource, PermLevel>>

// Fetches the full permission matrix for a project, merging DB rows with defaults.
// If a row doesn't exist in DB for (role, resource), falls back to DEFAULT_PERMISSIONS.
export function useProjectPermissions(projectId: string) {
  const supabase = createClient()
  return useQuery<PermMatrix>({
    queryKey: ['project-permissions', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_role_permissions')
        .select('role_name, resource, can_view, can_edit, can_delete')
        .eq('project_id', projectId)
      if (error) throw error

      // Build lookup from DB rows
      const dbMap: Record<string, Record<string, PermLevel>> = {}
      for (const row of (data ?? [])) {
        if (!dbMap[row.role_name]) dbMap[row.role_name] = {}
        dbMap[row.role_name][row.resource] = rowToLevel(row.can_view, row.can_edit, row.can_delete)
      }

      // Merge: DB takes precedence over defaults
      const matrix: PermMatrix = {}
      for (const role of COLLAB_ROLES) {
        matrix[role] = {} as Record<Resource, PermLevel>
        for (const resource of RESOURCES) {
          matrix[role][resource] = dbMap[role]?.[resource] ?? DEFAULT_PERMISSIONS[role]?.[resource] ?? 'none'
        }
      }
      return matrix
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

// Upserts a single (role, resource) cell. Seeds all defaults on first write.
export function useUpsertPermission(projectId: string) {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      role,
      resource,
      level,
    }: {
      role: string
      resource: Resource
      level: PermLevel
    }) => {
      const { error } = await (supabase as any)
        .from('project_role_permissions')
        .upsert(
          { project_id: projectId, role_name: role, resource, ...levelToFlags(level) },
          { onConflict: 'project_id,role_name,resource' }
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-permissions', projectId] }),
  })
}

// Derives what the current (non-main-artist) user can do by unioning all their roles.
export function useMyEffectivePermissions(projectId: string) {
  const { data: currentUser } = useCurrentUser()
  const { data: collaborators = [] } = useCollaborators(projectId)
  const { data: matrix } = useProjectPermissions(projectId)

  const myCollab = collaborators.find(c => c.user_id === currentUser?.id)

  if (!myCollab) return null

  // Main artist gets everything
  if (myCollab.is_main_artist) {
    const full: Record<Resource, PermLevel> = {} as Record<Resource, PermLevel>
    for (const r of RESOURCES) full[r] = 'full'
    return full
  }

  if (!matrix) return null

  const effective: Record<Resource, PermLevel> = {} as Record<Resource, PermLevel>
  const order: Record<PermLevel, number> = { none: 0, view: 1, edit: 2, full: 3 }
  for (const resource of RESOURCES) {
    let best = 0
    for (const role of (myCollab.roles ?? [])) {
      const level = matrix[role]?.[resource] ?? 'none'
      if (order[level] > best) best = order[level]
      if (best === 3) break
    }
    const levels: PermLevel[] = ['none', 'view', 'edit', 'full']
    effective[resource] = levels[best] ?? 'none'
  }
  return effective
}
