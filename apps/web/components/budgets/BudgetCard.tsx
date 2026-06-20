'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { DollarSign, FolderOpen, ArrowRight, Clock } from 'lucide-react'
import type { Budget } from '@/hooks/useBudgets'
import { formatDistanceToNow } from 'date-fns'

type BudgetWithProject = Budget & { projects?: { id: string; title: string } | null }

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     className: 'text-muted-foreground bg-muted border-border' },
  active:    { label: 'Active',    className: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800' },
  completed: { label: 'Completed', className: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800' },
  archived:  { label: 'Archived',  className: 'text-muted-foreground bg-muted border-border' },
}

function getSymbol(currency: string) {
  return currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency
}

export function BudgetCard({ budget }: { budget: BudgetWithProject }) {
  const sym = getSymbol(budget.currency)
  const status = STATUS_CONFIG[budget.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft
  const focusAreas = (budget.focus_areas as string[] | null) ?? []

  return (
    <Link
      href={`/budgets/${budget.id}`}
      className="block rounded-lg border border-border bg-card hover:border-foreground/20 hover:bg-accent/30 transition-all group"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{budget.title}</h3>
            {budget.projects && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <FolderOpen size={11} />
                <span className="truncate">{budget.projects.title}</span>
              </div>
            )}
          </div>
          <span className={cn('shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium', status.className)}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <DollarSign size={14} className="text-muted-foreground shrink-0" />
          <span className="text-xl font-bold font-mono">
            {sym}{Number(budget.total_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs text-muted-foreground">{budget.currency}</span>
        </div>

        {focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {focusAreas.slice(0, 4).map(area => (
              <span key={area} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                {area.replace(/_/g, ' ')}
              </span>
            ))}
            {focusAreas.length > 4 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                +{focusAreas.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={11} />
            <span>Updated {formatDistanceToNow(new Date(budget.updated_at), { addSuffix: true })}</span>
          </div>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}
