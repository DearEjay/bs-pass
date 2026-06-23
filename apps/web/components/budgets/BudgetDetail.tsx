'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBudget, useBudgetLineItems, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { BudgetSpreadsheet } from './BudgetSpreadsheet'
import { exportXLSX, exportCSV } from './budgetExport'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Download, FileText, FileSpreadsheet, FileJson,
  Sparkles, ChevronDown, Edit2, Trash2, Loader2, X, Check, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived',  label: 'Archived' },
]

function getSymbol(currency: string) {
  return currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency
}

export function BudgetDetail({ budgetId, userId }: { budgetId: string; userId: string }) {
  const router = useRouter()
  const { data: budget, isLoading: budgetLoading } = useBudget(budgetId)
  const { data: lineItems = [], isLoading: itemsLoading } = useBudgetLineItems(budgetId)
  const updateBudget = useUpdateBudget(budgetId, userId)
  const deleteBudget = useDeleteBudget(userId)

  const [showExport, setShowExport] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAdvice, setShowAdvice] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  // Live totals from spreadsheet optimistic edits — updates instantly on cell change
  const [liveTotals, setLiveTotals] = useState<{ budgeted: number; actual: number } | null>(null)

  if (budgetLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Budget not found.</p>
        <Link href="/budgets" className="text-primary text-sm mt-2 inline-block hover:underline">
          ← Back to budgets
        </Link>
      </div>
    )
  }

  const sym = getSymbol(budget.currency)
  const dbBudgeted = lineItems.reduce((s, i) => s + (i.budgeted ?? 0), 0)
  const dbActual   = lineItems.reduce((s, i) => s + (i.actual   ?? 0), 0)
  // Prefer live (optimistic) totals from the spreadsheet; fall back to DB values
  const grandBudgeted = liveTotals?.budgeted ?? dbBudgeted
  const grandActual   = liveTotals?.actual   ?? dbActual
  const pctSpent = grandBudgeted > 0 ? (grandActual / grandBudgeted) * 100 : 0

  async function handleExportPDF() {
    setPdfLoading(true)
    try {
      const { exportPDF } = await import('./BudgetPDF')
      await exportPDF(budget!, lineItems)
    } finally {
      setPdfLoading(false)
    }
  }

  function handleExportXLSX() {
    exportXLSX(budget!, lineItems)
  }

  function handleExportCSV() {
    exportCSV(budget!, lineItems)
  }

  function startEditTitle() {
    if (!budget) return
    setTitleDraft(budget.title)
    setEditingTitle(true)
  }

  function commitTitle() {
    if (!budget) return
    if (titleDraft.trim() && titleDraft !== budget.title) {
      updateBudget.mutate({ title: titleDraft.trim() })
    }
    setEditingTitle(false)
  }

  async function handleDelete() {
    try {
      await deleteBudget.mutateAsync(budgetId)
      router.push('/budgets')
    } catch {
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-24 max-w-6xl mx-auto">
      {/* Back + title row */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/budgets"
          className="mt-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                autoFocus
                className="text-2xl font-bold bg-input border border-ring rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring flex-1"
              />
              <button onClick={commitTitle} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                <Check size={16} />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold truncate">{budget.title}</h1>
              <button
                onClick={startEditTitle}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all"
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}

          {(budget as typeof budget & { projects?: { title: string } | null }).projects && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Linked to{' '}
              <span className="font-medium text-foreground">
                {(budget as typeof budget & { projects?: { title: string } | null }).projects!.title}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status selector */}
          <select
            value={budget.status}
            onChange={e => updateBudget.mutate({ status: e.target.value as typeof budget.status })}
            className="px-2 py-1.5 rounded-md border border-border bg-card text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Export dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} />
            </button>

            {showExport && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg w-40 py-1 text-sm">
                  <button
                    onClick={() => { handleExportPDF(); setShowExport(false) }}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    PDF
                  </button>
                  <button
                    onClick={() => { handleExportXLSX(); setShowExport(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <FileSpreadsheet size={14} />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => { handleExportCSV(); setShowExport(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <FileJson size={14} />
                    CSV
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertTriangle size={12} className="text-destructive" />
              <span className="text-xs text-destructive">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={deleteBudget.isPending}
                className="text-xs px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-1"
              >
                {deleteBudget.isPending && <Loader2 size={10} className="animate-spin" />}
                Yes
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Budget',  value: `${sym}${Number(budget.total_amount).toLocaleString()}`, sub: budget.currency },
          { label: 'Budgeted',      value: `${sym}${grandBudgeted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: 'planned' },
          { label: 'Actual Spent',  value: `${sym}${grandActual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: `${pctSpent.toFixed(0)}% of budget` },
          { label: 'Remaining',     value: `${sym}${(grandBudgeted - grandActual).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            sub: grandBudgeted > grandActual ? 'under budget' : 'over budget',
            valueClass: grandBudgeted >= grandActual ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive' },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn('text-lg font-bold font-mono mt-0.5', stat.valueClass)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Spend progress bar */}
      {grandBudgeted > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Spend progress</span>
            <span>{pctSpent.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pctSpent > 100 ? 'bg-destructive' : 'bg-primary',
              )}
              style={{ width: `${Math.min(pctSpent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* AI Advice (collapsible) */}
      {budget.ai_advice && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvice(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles size={14} />
            AI Budget Insights
            <ChevronDown size={13} className={cn('ml-auto transition-transform', showAdvice && 'rotate-180')} />
          </button>
          {showAdvice && (
            <div className="px-4 pb-4 pt-0 text-sm text-foreground leading-relaxed border-t border-primary/10">
              {budget.ai_advice}
            </div>
          )}
        </div>
      )}

      {/* Spreadsheet */}
      {itemsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <BudgetSpreadsheet
          budgetId={budgetId}
          lineItems={lineItems}
          totalAmount={Number(budget.total_amount)}
          currency={budget.currency}
          onTotalsChange={setLiveTotals}
        />
      )}

      <p className="mt-4 text-xs text-muted-foreground text-center">
        Click any cell to edit · Enter or Tab to confirm · Esc to cancel · All totals update instantly
      </p>
    </div>
  )
}
