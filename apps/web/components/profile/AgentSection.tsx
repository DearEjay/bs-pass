'use client'

import { useState, useEffect } from 'react'
import { Loader2, X, RotateCcw } from 'lucide-react'
import { useAgentPreferences, useUpdateAgentPreferences, useResetAgentLearning } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const AGENT_MODES = [
  { value: 'conservative', label: 'Conservative', description: 'Fewer, more certain suggestions' },
  { value: 'moderate', label: 'Moderate', description: 'Balanced suggestions' },
  { value: 'aggressive', label: 'Aggressive', description: 'More frequent, proactive suggestions' },
]

export function AgentSection({ userId }: { userId: string }) {
  const { data: prefs } = useAgentPreferences(userId)
  const updatePrefs = useUpdateAgentPreferences(userId)
  const resetLearning = useResetAgentLearning(userId)

  const [agentMode, setAgentMode] = useState('moderate')
  const [bufferDays, setBufferDays] = useState(0)
  const [learningEnabled, setLearningEnabled] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    if (prefs) {
      setAgentMode(prefs.preferred_agent_mode ?? 'moderate')
      setBufferDays(prefs.preferred_timeline_buffer_days ?? 0)
      setLearningEnabled(prefs.learning_enabled ?? true)
      setDirty(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.user_id])

  function change<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  async function save() {
    await updatePrefs.mutateAsync({
      preferred_agent_mode: agentMode,
      preferred_timeline_buffer_days: bufferDays,
      learning_enabled: learningEnabled,
    })
    setDirty(false)
  }

  async function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return }
    await resetLearning.mutateAsync()
    setResetConfirm(false)
    setAgentMode('moderate')
    setBufferDays(0)
    setLearningEnabled(true)
    setDirty(false)
  }

  const avoididTypes = prefs?.avoided_task_types ?? []

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-base mb-1">AI Agent</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Configure how the Roadmap Agent behaves across all your projects.
      </p>

      {/* Agent mode */}
      <div className="mb-5">
        <p className="text-sm font-medium mb-2">Agent mode</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {AGENT_MODES.map(mode => (
            <button
              key={mode.value}
              type="button"
              onClick={() => change<string>(setAgentMode)(mode.value)}
              className={cn(
                'p-3 rounded-md border text-left transition-colors',
                agentMode === mode.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50',
              )}
            >
              <p className={cn('text-sm font-medium', agentMode === mode.value ? 'text-primary' : '')}>
                {mode.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline buffer */}
      <div className="mb-5">
        <label className="text-sm font-medium block mb-1">Timeline buffer</label>
        <p className="text-xs text-muted-foreground mb-2">
          Extra days the agent adds to each task deadline to account for delays.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={30}
            value={bufferDays}
            onChange={e => change<number>(setBufferDays)(Number(e.target.value))}
            className="w-20 px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </div>

      {/* Learning toggle */}
      <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-border">
        <div>
          <p className="text-sm font-medium">Agent learning</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agent learns from your task feedback to improve future suggestions.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={learningEnabled}
          onClick={() => change<boolean>(setLearningEnabled)(!learningEnabled)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            learningEnabled ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              learningEnabled ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Avoided task types (agent-managed, read-only display) */}
      <div className="mb-5">
        <p className="text-sm font-medium mb-1">Learned task preferences</p>
        <p className="text-xs text-muted-foreground mb-2">
          Task types the agent has learned you prefer to avoid.
        </p>
        {avoididTypes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">None yet — the agent will populate this as it learns.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {avoididTypes.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reset learning */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Reset agent learning</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clears all learned preferences and restores defaults.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetLearning.isPending}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors',
            resetConfirm
              ? 'border-destructive text-destructive hover:bg-destructive/5'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {resetLearning.isPending
            ? <Loader2 size={13} className="animate-spin" />
            : <RotateCcw size={13} />
          }
          {resetConfirm ? 'Confirm reset' : 'Reset'}
        </button>
      </div>

      {dirty && (
        <div className="mt-5 pt-5 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={updatePrefs.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {updatePrefs.isPending && <Loader2 size={13} className="animate-spin" />}
            Save preferences
          </button>
        </div>
      )}
    </div>
  )
}
