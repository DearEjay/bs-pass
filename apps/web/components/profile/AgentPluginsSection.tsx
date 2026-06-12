'use client'

import { useEffect, useState } from 'react'
import { Loader2, Megaphone, Share2, Lightbulb, Palette, Calendar, Users } from 'lucide-react'
import { useAgentPreferences, useUpdateAgentPreferences } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const PLUGINS = [
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Promotional campaigns, release strategy, and press outreach tasks.',
    Icon: Megaphone,
  },
  {
    id: 'social',
    label: 'Social Media',
    description: 'Content calendar, post scheduling, and platform-specific rollout.',
    Icon: Share2,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    description: 'Sync licensing, playlist pitching, and brand partnership tasks.',
    Icon: Lightbulb,
  },
  {
    id: 'creative',
    label: 'Creative',
    description: 'Artwork direction, music video production, and visual asset tasks.',
    Icon: Palette,
  },
  {
    id: 'booking',
    label: 'Booking',
    description: 'Live show planning, tour logistics, and venue outreach tasks.',
    Icon: Calendar,
  },
  {
    id: 'fan',
    label: 'Fan Engagement',
    description: 'Newsletter, community updates, and fan-facing content tasks.',
    Icon: Users,
  },
] as const

type PluginId = typeof PLUGINS[number]['id']

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export function AgentPluginsSection({ userId }: { userId: string }) {
  const { data: prefs } = useAgentPreferences(userId)
  const updatePrefs = useUpdateAgentPreferences(userId)

  const [plugins, setPlugins] = useState<Record<PluginId, boolean>>({
    marketing: false, social: false, opportunities: false,
    creative: false, booking: false, fan: false,
  })
  const [saving, setSaving] = useState<PluginId | null>(null)

  useEffect(() => {
    if (prefs?.enabled_plugins) {
      const stored = prefs.enabled_plugins as Record<string, boolean>
      setPlugins(prev => ({ ...prev, ...stored }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.user_id])

  async function handleToggle(id: PluginId) {
    const next = { ...plugins, [id]: !plugins[id] }
    setPlugins(next)
    setSaving(id)
    try {
      await updatePrefs.mutateAsync({ enabled_plugins: next })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-base mb-1">Agent Plugins</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Enable plugins to expand the roadmap agent's scope into specific areas of your career.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLUGINS.map(({ id, label, description, Icon }) => {
          const enabled = plugins[id]
          return (
            <div
              key={id}
              className={cn(
                'relative p-4 rounded-lg border transition-colors',
                enabled ? 'border-primary/40 bg-primary/5' : 'border-border',
              )}
            >
              {/* Icon + toggle row */}
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  'p-1.5 rounded-md',
                  enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}>
                  <Icon size={14} />
                </div>
                {saving === id
                  ? <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  : <Toggle checked={enabled} onChange={() => handleToggle(id)} />
                }
              </div>
              {/* Title + description — full width, never competes with toggle */}
              <p className={cn('text-sm font-medium', enabled && 'text-primary')}>{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
