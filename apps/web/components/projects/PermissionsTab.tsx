'use client'

import { Shield, Crown, Info } from 'lucide-react'
import {
  useProjectPermissions,
  useUpsertPermission,
  COLLAB_ROLES,
  ROLE_LABELS,
  RESOURCES,
  RESOURCE_LABELS,
  type Resource,
  type PermLevel,
} from '@/hooks/useProjectPermissions'
import { cn } from '@/lib/utils'

const LEVEL_CONFIG: Record<PermLevel, { label: string; short: string; bg: string; text: string; ring: string }> = {
  none: { label: 'No access', short: 'None', bg: 'bg-muted/50',        text: 'text-muted-foreground', ring: 'ring-border/50' },
  view: { label: 'View only', short: 'View', bg: 'bg-blue-500/10',     text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400/40' },
  edit: { label: 'View + Edit', short: 'Edit', bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-400/40' },
  full: { label: 'Full access', short: 'Full', bg: 'bg-emerald-500/10',text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400/40' },
}

const LEVEL_ORDER: PermLevel[] = ['none', 'view', 'edit', 'full']

function PermCell({
  level,
  locked,
  onChange,
  saving,
}: {
  level: PermLevel
  locked?: boolean
  onChange?: (next: PermLevel) => void
  saving?: boolean
}) {
  const cfg = LEVEL_CONFIG[level]

  function cycle() {
    if (locked || !onChange) return
    const idx = LEVEL_ORDER.indexOf(level)
    onChange(LEVEL_ORDER[(idx + 1) % LEVEL_ORDER.length])
  }

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={locked || saving}
      title={cfg.label}
      className={cn(
        'w-full h-8 rounded-md text-[11px] font-semibold ring-1 transition-all select-none',
        cfg.bg, cfg.text, cfg.ring,
        !locked && 'hover:ring-2 hover:brightness-105 cursor-pointer',
        locked && 'cursor-default opacity-90',
        saving && 'opacity-50',
      )}
    >
      {cfg.short}
    </button>
  )
}

export function PermissionsTab({ projectId }: { projectId: string }) {
  const { data: matrix, isLoading } = useProjectPermissions(projectId)
  const upsert = useUpsertPermission(projectId)

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 rounded-md bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="rounded-lg border border-border bg-accent/30 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Info size={12} />
          Click any cell to cycle through permission levels
        </div>
        <div className="flex flex-wrap gap-2">
          {LEVEL_ORDER.map(l => {
            const c = LEVEL_CONFIG[l]
            return (
              <span
                key={l}
                className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ring-1', c.bg, c.text, c.ring)}
              >
                {c.short}
                <span className="font-normal opacity-70">— {c.label}</span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Matrix — horizontally scrollable on small screens */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full border-collapse" style={{ minWidth: '480px' }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3 w-40 sticky left-0 bg-card z-10">
                Role
              </th>
              {RESOURCES.map(r => (
                <th key={r} className="text-center text-xs font-medium text-muted-foreground pb-2 px-1 min-w-[72px]">
                  {RESOURCE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {/* Main artist — always full, locked */}
            <tr className="group">
              <td className="py-1.5 pr-3 sticky left-0 bg-card z-10">
                <div className="flex items-center gap-1.5">
                  <Crown size={11} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold truncate">Project Owner</span>
                </div>
              </td>
              {RESOURCES.map(r => (
                <td key={r} className="py-1.5 px-1">
                  <PermCell level="full" locked />
                </td>
              ))}
            </tr>

            {/* All other roles */}
            {COLLAB_ROLES.map(role => {
              const rowPerms = matrix?.[role]
              return (
                <tr key={role} className="group">
                  <td className="py-1.5 pr-3 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-1.5">
                      <Shield size={11} className="text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{ROLE_LABELS[role] ?? role}</span>
                    </div>
                  </td>
                  {RESOURCES.map(resource => (
                    <td key={resource} className="py-1.5 px-1">
                      <PermCell
                        level={rowPerms?.[resource as Resource] ?? 'none'}
                        saving={upsert.isPending}
                        onChange={level =>
                          upsert.mutate({ role, resource: resource as Resource, level })
                        }
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {upsert.isError && (
        <p className="text-xs text-destructive">
          {(upsert.error as Error)?.message ?? 'Failed to save — try again.'}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Changes are saved immediately. These permissions apply to collaborators whose assigned
        role matches the row. Collaborators with multiple roles inherit the highest permission level.
      </p>
    </div>
  )
}
