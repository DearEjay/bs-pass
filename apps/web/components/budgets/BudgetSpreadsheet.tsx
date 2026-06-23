'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useUpdateLineItem, type LineItem } from '@/hooks/useBudgets'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%'
}

type Field = 'label' | 'budgeted' | 'actual' | 'notes'

type Row =
  | { type: 'category'; name: string }
  | { type: 'item'; item: LineItem }
  | { type: 'subtotal'; category: string; budgeted: number; actual: number }
  | { type: 'total'; budgeted: number; actual: number }

interface Props {
  budgetId: string
  lineItems: LineItem[]
  totalAmount: number
  currency: string
  onTotalsChange?: (totals: { budgeted: number; actual: number }) => void
}

// column layout: Label(flex) | Budgeted | Actual | Variance | % of Total | Notes(flex)
const COLS = 'grid-cols-[1fr_130px_130px_120px_105px_180px]'

export function BudgetSpreadsheet({ budgetId, lineItems, onTotalsChange }: Props) {
  const updateLineItem = useUpdateLineItem(budgetId)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Optimistic local overrides — edits display instantly before the DB round-trip
  const [localValues, setLocalValues] = useState<Record<string, Partial<LineItem>>>({})

  // Active cell edit
  const [editing, setEditing] = useState<{ itemId: string; field: Field } | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced save queue
  const pending = useRef<{ itemId: string; field: Field; value: unknown }[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Flush DB saves ──────────────────────────────────────────────────────────
  const flush = useCallback(() => {
    const changes = pending.current.splice(0)
    if (!changes.length) return
    const byItem = new Map<string, Record<string, unknown>>()
    for (const { itemId, field, value } of changes) {
      if (!byItem.has(itemId)) byItem.set(itemId, {})
      byItem.get(itemId)![field] = value
    }
    setSaveStatus('saving')
    Promise.all(
      [...byItem.entries()].map(([id, fields]) => {
        const update: Record<string, unknown> = { id }
        for (const [k, v] of Object.entries(fields)) {
          update[k] = k === 'budgeted' || k === 'actual'
            ? parseFloat(String(v)) || 0
            : String(v ?? '')
        }
        return updateLineItem.mutateAsync(update as { id: string } & Partial<LineItem>)
      }),
    )
      .then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) })
      .catch(() => setSaveStatus('idle'))
  }, [updateLineItem])

  // ── Commit a cell edit ──────────────────────────────────────────────────────
  const commitEdit = useCallback((itemId: string, field: Field, rawValue: string) => {
    const parsed: number | string =
      field === 'budgeted' || field === 'actual'
        ? parseFloat(rawValue) || 0
        : rawValue

    // Instantly update local display — rows memo recalculates subtotals/totals
    setLocalValues(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [field]: parsed },
    }))

    pending.current.push({ itemId, field, value: parsed })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 800)
    setEditing(null)
  }, [flush])

  // ── Start editing a cell ────────────────────────────────────────────────────
  const startEdit = useCallback((item: LineItem, field: Field) => {
    const d = { ...item, ...(localValues[item.id] ?? {}) }
    const val =
      field === 'budgeted' ? String(d.budgeted ?? 0)
      : field === 'actual' ? String(d.actual ?? 0)
      : field === 'label'  ? String(d.label ?? '')
      : String(d.notes ?? '')
    setEditing({ itemId: item.id, field })
    setEditValue(val)
    // Focus after React has painted the input
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }, [localValues])

  // ── Build display rows (recalculates whenever localValues changes) ───────────
  const { rows, grandBudgeted, grandActual } = useMemo(() => {
    const grouped = new Map<string, LineItem[]>()
    for (const item of lineItems) {
      const cat = item.category || 'Miscellaneous'
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push(item)
    }
    for (const items of grouped.values()) {
      items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }

    const rows: Row[] = []
    let grandB = 0
    let grandA = 0

    for (const [cat, items] of grouped) {
      rows.push({ type: 'category', name: cat })
      let subB = 0, subA = 0
      for (const item of items) {
        const d = { ...item, ...(localValues[item.id] ?? {}) }
        subB += Number(d.budgeted ?? 0)
        subA += Number(d.actual ?? 0)
        rows.push({ type: 'item', item })
      }
      rows.push({ type: 'subtotal', category: cat, budgeted: subB, actual: subA })
      grandB += subB
      grandA += subA
    }
    rows.push({ type: 'total', budgeted: grandB, actual: grandA })
    return { rows, grandBudgeted: grandB, grandActual: grandA }
  }, [lineItems, localValues])

  // Notify parent whenever live totals change so summary cards stay in sync
  useEffect(() => {
    onTotalsChange?.({ budgeted: grandBudgeted, actual: grandActual })
  }, [grandBudgeted, grandActual, onTotalsChange])

  // ── Cell renderer — called as renderCell(...), NOT as <RenderCell /> ─────────
  // Calling as a plain function means React never sees a component-type change
  // between renders, so the <input> stays mounted while the user types.
  function renderCell(item: LineItem, field: Field, display: string, align: 'left' | 'right' = 'right') {
    const isEditing = editing?.itemId === item.id && editing.field === field

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setEditing(null); return }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault()
              commitEdit(item.id, field, editValue)
            }
          }}
          onBlur={() => commitEdit(item.id, field, editValue)}
          className="w-full h-full px-2 py-1 text-xs bg-blue-50 border border-blue-400 rounded focus:outline-none ring-2 ring-blue-300/40"
        />
      )
    }

    return (
      <div
        className={cn(
          'truncate w-full px-2 py-1 rounded text-xs cursor-pointer transition-colors select-none',
          'hover:bg-blue-50 hover:text-blue-900',
          align === 'right' ? 'text-right' : 'text-left',
        )}
        onClick={() => startEdit(item, field)}
        title="Click to edit"
      >
        {display || <span className="text-muted-foreground/30">—</span>}
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-border overflow-hidden">

      {/* Save indicator */}
      {saveStatus !== 'idle' && (
        <div className="absolute top-2.5 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs pointer-events-none">
          {saveStatus === 'saving'
            ? <><Loader2 size={11} className="animate-spin text-gray-400" /><span className="text-gray-500">Saving…</span></>
            : <><CheckCircle2 size={11} className="text-emerald-500" /><span className="text-emerald-600">Saved</span></>
          }
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className={cn('grid sticky top-0 z-10 border-b-2 border-border', COLS)}>
        {[
          { label: 'Item',       align: 'left'  },
          { label: 'Budgeted',   align: 'right' },
          { label: 'Actual',     align: 'right' },
          { label: 'Variance',   align: 'right' },
          { label: '% of Total', align: 'right' },
          { label: 'Notes',      align: 'left'  },
        ].map(({ label, align }) => (
          <div
            key={label}
            className={cn(
              'px-3 py-2.5 text-xs font-semibold bg-slate-100 text-slate-600 border-r last:border-r-0 border-border/50',
              align === 'right' ? 'text-right' : 'text-left',
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Rows ───────────────────────────────────────────────────────────────── */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 520px)', minHeight: 280 }}>
        {rows.map((row, idx) => {

          /* ── Category header ── */
          if (row.type === 'category') {
            return (
              <div key={`cat-${row.name}-${idx}`} className={cn('grid border-b border-border/30', COLS)}>
                <div className="col-span-6 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50">
                  {row.name}
                </div>
              </div>
            )
          }

          /* ── Subtotal ── */
          if (row.type === 'subtotal') {
            const v = row.budgeted - row.actual
            return (
              <div key={`sub-${row.category}-${idx}`} className={cn('grid border-b border-border/30 bg-slate-50/70', COLS)}>
                <div className="px-3 py-1.5 text-[11px] italic text-slate-400 border-r border-border/20">Subtotal</div>
                <div className="px-3 py-1.5 text-xs font-semibold text-right text-slate-600 border-r border-border/20 font-mono">{fmt(row.budgeted)}</div>
                <div className="px-3 py-1.5 text-xs font-semibold text-right text-slate-600 border-r border-border/20 font-mono">{fmt(row.actual)}</div>
                <div className={cn('px-3 py-1.5 text-xs font-semibold text-right border-r border-border/20 font-mono', v >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {v < 0 && '−'}{fmt(Math.abs(v))}
                </div>
                <div className="px-3 py-1.5 border-r border-border/20" />
                <div className="px-3 py-1.5" />
              </div>
            )
          }

          /* ── Grand total ── */
          if (row.type === 'total') {
            const v = row.budgeted - row.actual
            return (
              <div key="total" className={cn('grid border-t-2 border-border bg-blue-50', COLS)}>
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-800 border-r border-blue-200">Total</div>
                <div className="px-3 py-2 text-xs font-bold text-right text-blue-800 border-r border-blue-200 font-mono">{fmt(row.budgeted)}</div>
                <div className="px-3 py-2 text-xs font-bold text-right text-blue-800 border-r border-blue-200 font-mono">{fmt(row.actual)}</div>
                <div className={cn('px-3 py-2 text-xs font-bold text-right border-r border-blue-200 font-mono', v >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {v < 0 && '−'}{fmt(Math.abs(v))}
                </div>
                <div className="px-3 py-2 text-xs font-bold text-right text-blue-800 border-r border-blue-200">100.0%</div>
                <div className="px-3 py-2" />
              </div>
            )
          }

          /* ── Item row ── */
          const d = { ...row.item, ...(localValues[row.item.id] ?? {}) }
          const b = Number(d.budgeted ?? 0)
          const a = Number(d.actual ?? 0)
          const variance = b - a
          const pct = grandBudgeted > 0 ? b / grandBudgeted : 0
          const isActiveRow = editing?.itemId === row.item.id

          return (
            <div
              key={row.item.id}
              className={cn(
                'grid border-b border-border/15 group',
                isActiveRow ? 'bg-blue-50/30' : 'hover:bg-muted/20',
                COLS,
              )}
            >
              {/* Label */}
              <div className="border-r border-border/15 px-1 min-h-[34px] flex items-center">
                {renderCell(row.item, 'label', d.label || '', 'left')}
              </div>
              {/* Budgeted */}
              <div className="border-r border-border/15 px-1 flex items-center">
                {renderCell(row.item, 'budgeted', fmt(b))}
              </div>
              {/* Actual */}
              <div className="border-r border-border/15 px-1 flex items-center">
                {renderCell(row.item, 'actual', fmt(a))}
              </div>
              {/* Variance (computed — always live) */}
              <div className={cn(
                'border-r border-border/15 px-3 text-xs text-right flex items-center justify-end font-mono',
                variance >= 0 ? 'text-emerald-600' : 'text-red-500',
              )}>
                {variance < 0 && '−'}{fmt(Math.abs(variance))}
              </div>
              {/* % of Total (computed — always live) */}
              <div className="border-r border-border/15 px-3 text-xs text-right text-slate-500 flex items-center justify-end">
                {fmtPct(pct)}
              </div>
              {/* Notes */}
              <div className="px-1 flex items-center">
                {renderCell(row.item, 'notes', d.notes || '', 'left')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 text-[11px] text-muted-foreground/40 bg-slate-50/60 border-t border-border/20">
        Click to edit · Enter or Tab to confirm · Esc to cancel · Totals update instantly
      </div>
    </div>
  )
}
