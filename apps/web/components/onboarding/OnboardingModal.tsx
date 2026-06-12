'use client'

import { useState, useEffect } from 'react'
import { X, FolderOpen, Music, ListChecks, Users, PieChart, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'

const STORAGE_KEY = 'bs-pass:onboarding-done'

interface Step {
  icon: React.ElementType
  title: string
  description: string
  tip: string
}

const STEPS: Step[] = [
  {
    icon: FolderOpen,
    title: 'Create a Project',
    description: 'A project is your release — a single, EP, album, or mixtape. Everything lives inside it: tracks, tasks, splits, and your team.',
    tip: 'Hit "+ New project" on your dashboard to get started. The AI agent will auto-generate a roadmap for you.',
  },
  {
    icon: Music,
    title: 'Add Your Tracks',
    description: 'Upload stems, set the track status (Recording → Mixed → Mastered → Released), and credit everyone who contributed.',
    tip: 'Track status drives your project status — BS-PASS keeps the big picture current automatically.',
  },
  {
    icon: ListChecks,
    title: 'Roadmap & Tasks',
    description: 'Your AI-generated roadmap breaks the project into actionable tasks with deadlines and priorities. You can add, edit, and reorder tasks.',
    tip: 'Use "Auto-assign" to let the agent match tasks to collaborators based on their roles.',
  },
  {
    icon: Users,
    title: 'Invite Collaborators',
    description: 'Add producers, engineers, managers, and featured artists. Each person gets role-based access — only the main artist can change splits or remove people.',
    tip: 'When you add someone, the agent will automatically assign relevant existing tasks to them.',
  },
  {
    icon: PieChart,
    title: 'Royalty Splits',
    description: 'Define who gets what percentage for each track. Click "Auto-populate" to pull splits from your track credits, then send signature requests.',
    tip: 'All parties receive a link to review and sign. The signed PDF is generated on-demand — nothing is stored permanently.',
  },
  {
    icon: Sparkles,
    title: 'Your AI Agent',
    description: 'The AI agent creates roadmaps, writes chat updates, assigns tasks, and reacts to events — all based on your project context and preferences.',
    tip: 'Customise the agent\'s tone, verbosity, and plugins in Profile → AI Agent. It learns from your feedback over time.',
  },
]

export function OnboardingModal({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
      track.onboardingStarted()
    }
  }, [userId])

  useEffect(() => {
    if (visible) {
      track.onboardingStepViewed({ step, title: STEPS[step].title })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visible])

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    track.onboardingCompleted()
  }

  function skip() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    track.onboardingSkipped({ at_step: step })
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85svh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted hover:bg-muted-foreground/50',
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={skip}
            className="p-1.5 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tutorial"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 flex-1">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5 mx-auto">
            <Icon size={26} className="text-primary" />
          </div>

          <h2 className="text-lg font-semibold text-center mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
            {current.description}
          </p>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-primary/90 leading-relaxed">
              <span className="font-semibold">Tip: </span>{current.tip}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-border pt-4">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}

          <button
            onClick={() => skip()}
            className={cn('text-xs text-muted-foreground hover:text-foreground transition-colors', step === 0 ? '' : 'ml-auto')}
          >
            {step === 0 ? 'Skip tutorial' : ''}
          </button>

          <button
            onClick={isLast ? finish : () => setStep(s => s + 1)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity',
              step === 0 ? 'ml-auto' : '',
            )}
          >
            {isLast ? 'Get started' : 'Next'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 pb-3">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  )
}
