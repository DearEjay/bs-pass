'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import HyperFormula from 'hyperformula'
import { cn } from '@/lib/utils'
import {
  useUpdateLineItem, useAddLineItem, useDeleteLineItem,
  type LineItem,
} from '@/hooks/useBudgets'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'

// ── Column definitions ──────────────────────────────────────────────────────

export const COLS = [
  { key: 'label',    label: 'Item',       width: 'flex-1 min-w-[180px]',    align: 'left'  },
  { key: 'budgeted', label: 'Budgeted',   width: 'w-28 shrink-0',            align: 'right' },
  { key: 'actual',   label: 'Actual',     width: 'w-28 shrink-0',            align: 'right' },
  { key: 'variance', label: 'Variance',   width: 'w-28 shrink-0',            align: 'right' },
  { key: 'pct',      label: '% of Total', width: 'w-24 shrink-0',            align: 'right' },
  { key: 'notes',    label: 'Notes',      width: 'w-44 shrink-0',            align: 'left'  },
] as const

type ColKey = typeof COLS[number]['key']

// ── HyperFormula singleton ──────────────────────────────────────────────────

function createHF() {
  return HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' })
}

// ── Cell editor ─────────────────────────────────────────────────────────────

function CellInput({
  value,
  onCommit,
  align = 'left',
  placeholder = '',
  numeric = false,
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  align?: 'left' | 'right'
  placeholder?: string
  numeric?: boolean
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes when not editing
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function startEdit() {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit() {
    setEditing(false)
    if (draft !== value) onCommit(draft)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
    e.stopPropagation()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        placeholder={placeholder}
        className={cn(
          'w-full px-1 py-0.5 text-sm bg-input border border-ring rounded focus:outline-none focus:ring-1 focus:ring-ring',
          align === 'right' && 'text-right',
          className,
        )}
      />
    )
  }

  return (
    <div
      onDoubleClick={startEdit}
      onClick={startEdit}
      title="Click to edit"
      className={cn(
        'w-full px-1 py-0.5 text-sm cursor-pointer rounded hover:bg-muted/50 truncate select-none',
        align === 'right' && 'text-right',
        !value && 'text-muted-foreground/50',
        className,
      )}
    >
      {value || placeholder}
    </div>
  )
}

// ── Spreadsheet row ─────────────────────────────────────────────────────────

interface RowProps {
  item: LineItem
  totalBudget: number
  currency: string
  budgetId: string
  onDelete: () => void
}

function SpreadsheetRow({ item, totalBudget, currency, budgetId, onDelete }: RowProps) {
  const updateItem = useUpdateLineItem(budgetId)
  const sym = currency === 'USD' ? '$' : currency

  const variance = (item.budgeted ?? 0) - (item.actual ?? 0)
  const pct = totalBudget > 0 ? ((item.budgeted ?? 0) / totalBudget) * 100 : 0

  function fmt(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function save(field: keyof LineItem, raw: string) {
    const isNumeric = field === 'budgeted' || field === 'actual'
    const value = isNumeric ? Number(raw.replace(/[^0-9.-]/g, '')) : raw
    updateItem.mutate({ id: item.id, [field]: value })
  }

  return (
    <div className="flex items-center gap-0 border-b border-border/50 group/row hover:bg-muted/20 transition-colors">
      {/* Drag handle placeholder */}
      <div className="w-7 shrink-0 flex items-center justify-center opacity-0 group-hover/row:opacity-40 transition-opacity">
        <GripVertical size={13} className="text-muted-foreground" />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-[180px] px-2 py-1.5">
        <CellInput
          value={item.label}
          onCommit={v => save('label', v)}
          placeholder="Item name…"
        />
      </div>

      {/* Budgeted */}
      <div className="w-28 shrink-0 px-2 py-1.5 border-l border-border/30">
        <CellInput
          value={fmt(item.budgeted ?? 0)}
          onCommit={v => save('budgeted', v)}
          align="right"
          numeric
        />
      </div>

      {/* Actual */}
      <div className="w-28 shrink-0 px-2 py-1.5 border-l border-border/30">
        <CellInput
          value={fmt(item.actual ?? 0)}
          onCommit={v => save('actual', v)}
          align="right"
          numeric
        />
      </div>

      {/* Variance (computed, read-only) */}
      <div className={cn(
        'w-28 shrink-0 px-3 py-1.5 border-l border-border/30 text-sm text-right font-mono select-none',
        variance > 0 ? 'text-emerald-600 dark:text-emerald-400'
          : variance < 0 ? 'text-destructive'
            : 'text-muted-foreground',
      )}>
        {variance >= 0 ? '' : '−'}{sym}{fmt(Math.abs(variance))}
      </div>

      {/* % of total (read-only) */}
      <div className="w-24 shrink-0 px-3 py-1.5 border-l border-border/30 text-sm text-right text-muted-foreground font-mono select-none">
        {pct.toFixed(1)}%
      </div>

      {/* Notes */}
      <div className="w-44 shrink-0 px-2 py-1.5 border-l border-border/30">
        <CellInput
          value={item.notes ?? ''}
          onCommit={v => save('notes', v)}
          placeholder="Notes…"
          className="text-muted-foreground"
        />
      </div>

      {/* Delete */}
      <div className="w-8 shrink-0 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Category section ────────────────────────────────────────────────────────

interface CategoryProps {
  name: string
  items: LineItem[]
  totalBudget: number
  currency: string
  budgetId: string
}

function CategorySection({ name, items, totalBudget, currency, budgetId }: CategoryProps) {
  const [collapsed, setCollapsed] = useState(false)
  const addItem = useAddLineItem(budgetId)
  const deleteItem = useDeleteLineItem(budgetId)

  const sym = currency === 'USD' ? '$' : currency
  const catBudgeted = items.reduce((s, i) => s + (i.budgeted ?? 0), 0)
  const catActual = items.reduce((s, i) => s + (i.actual ?? 0), 0)
  const catVariance = catBudgeted - catActual

  function fmt(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function addRow() {
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0)
    addItem.mutate({
      category: name,
      label: '',
      budgeted: 0,
      actual: 0,
      sort_order: maxOrder + 1,
    })
  }

  return (
    <div>
      {/* Category header */}
      <div
        className="flex items-center gap-0 bg-muted/40 border-b border-border cursor-pointer select-none"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="w-7 shrink-0 flex items-center justify-center">
          {collapsed
            ? <ChevronRight size={13} className="text-muted-foreground" />
            : <ChevronDown size={13} className="text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-[180px] px-2 py-2">
          <span className="text-sm font-semibold">{name}</span>
          <span className="ml-2 text-xs text-muted-foreground">({items.length})</span>
        </div>
        <div className="w-28 shrink-0 px-3 py-2 border-l border-border/30 text-sm font-semibold text-right font-mono">
          {sym}{fmt(catBudgeted)}
        </div>
        <div className="w-28 shrink-0 px-3 py-2 border-l border-border/30 text-sm font-semibold text-right font-mono">
          {sym}{fmt(catActual)}
        </div>
        <div className={cn(
          'w-28 shrink-0 px-3 py-2 border-l border-border/30 text-sm font-semibold text-right font-mono',
          catVariance > 0 ? 'text-emerald-600 dark:text-emerald-400'
            : catVariance < 0 ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {catVariance >= 0 ? '' : '−'}{sym}{fmt(Math.abs(catVariance))}
        </div>
        <div className="w-24 shrink-0 px-3 py-2 border-l border-border/30 text-sm font-semibold text-right font-mono text-muted-foreground">
          {totalBudget > 0 ? ((catBudgeted / totalBudget) * 100).toFixed(1) : '0.0'}%
        </div>
        <div className="w-44 shrink-0 px-2 py-2 border-l border-border/30" />
        <div className="w-8 shrink-0" />
      </div>

      {/* Rows */}
      {!collapsed && (
        <>
          {items.map(item => (
            <SpreadsheetRow
              key={item.id}
              item={item}
              totalBudget={totalBudget}
              currency={currency}
              budgetId={budgetId}
              onDelete={() => deleteItem.mutate(item.id)}
            />
          ))}

          {/* Add row button */}
          <div className="border-b border-border/50">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 w-full px-9 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <Plus size={11} />
              Add row
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main spreadsheet ────────────────────────────────────────────────────────

interface Props {
  budgetId: string
  lineItems: LineItem[]
  totalAmount: number
  currency: string
}

export function BudgetSpreadsheet({ budgetId, lineItems, totalAmount, currency }: Props) {
  const addItem = useAddLineItem(budgetId)
  const sym = currency === 'USD' ? '$' : currency

  // Group by category, preserve insertion order
  const categories = useMemo(() => {
    const order: string[] = []
    const map: Record<string, LineItem[]> = {}
    for (const item of lineItems) {
      if (!map[item.category]) { map[item.category] = []; order.push(item.category) }
      map[item.category].push(item)
    }
    return order.map(cat => ({ name: cat, items: map[cat] }))
  }, [lineItems])

  const grandBudgeted = lineItems.reduce((s, i) => s + (i.budgeted ?? 0), 0)
  const grandActual = lineItems.reduce((s, i) => s + (i.actual ?? 0), 0)
  const grandVariance = grandBudgeted - grandActual

  function fmt(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const CATEGORY_OPTIONS = [
    'Recording & Studio', 'Mixing & Mastering', 'Artwork & Creative',
    'Music Video & Content', 'Marketing & Promotion', 'Distribution',
    'Legal & Admin', 'Touring & Live', 'Wardrobe & Styling',
    'Content Creation', 'Miscellaneous',
  ]
  const [newCat, setNewCat] = useState('')
  const [showCatInput, setShowCatInput] = useState(false)

  function addCategory(cat: string) {
    if (!cat.trim()) return
    addItem.mutate({
      category: cat.trim(),
      label: '',
      budgeted: 0,
      actual: 0,
      sort_order: 0,
    })
    setNewCat('')
    setShowCatInput(false)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center bg-muted/60 border-b border-border text-xs font-medium text-muted-foreground sticky top-0 z-10">
        <div className="w-7 shrink-0" />
        {COLS.map(col => (
          <div
            key={col.key}
            className={cn(
              col.width, 'px-3 py-2.5 border-l border-border/40 first:border-l-0',
              col.align === 'right' && 'text-right',
            )}
          >
            {col.label}
          </div>
        ))}
        <div className="w-8 shrink-0" />
      </div>

      {/* Category sections */}
      {categories.map(({ name, items }) => (
        <CategorySection
          key={name}
          name={name}
          items={items}
          totalBudget={grandBudgeted || totalAmount}
          currency={currency}
          budgetId={budgetId}
        />
      ))}

      {/* Add category */}
      <div className="border-b border-border bg-muted/20">
        {showCatInput ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <select
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded border border-border bg-input text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            >
              <option value="">Pick a category…</option>
              {CATEGORY_OPTIONS.filter(c => !categories.find(x => x.name === c)).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
            {newCat === '__custom__' && (
              <input
                type="text"
                placeholder="Category name"
                onKeyDown={e => { if (e.key === 'Enter') addCategory((e.target as HTMLInputElement).value) }}
                className="flex-1 px-2 py-1.5 rounded border border-border bg-input text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
            <button
              type="button"
              onClick={() => addCategory(newCat)}
              disabled={!newCat || newCat === '__custom__'}
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowCatInput(false)}
              className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCatInput(true)}
            className="flex items-center gap-1.5 w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Plus size={12} />
            Add category
          </button>
        )}
      </div>

      {/* Totals footer */}
      <div className="flex items-center bg-foreground/5 border-t border-border font-semibold">
        <div className="w-7 shrink-0" />
        <div className="flex-1 min-w-[180px] px-3 py-3 text-sm">
          Totals
          {Math.abs(grandBudgeted - totalAmount) > 1 && grandBudgeted > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-500">
              (target: {sym}{totalAmount.toLocaleString()})
            </span>
          )}
        </div>
        <div className="w-28 shrink-0 px-3 py-3 text-right text-sm font-mono border-l border-border/30">
          {sym}{fmt(grandBudgeted)}
        </div>
        <div className="w-28 shrink-0 px-3 py-3 text-right text-sm font-mono border-l border-border/30">
          {sym}{fmt(grandActual)}
        </div>
        <div className={cn(
          'w-28 shrink-0 px-3 py-3 text-right text-sm font-mono border-l border-border/30',
          grandVariance > 0 ? 'text-emerald-600 dark:text-emerald-400'
            : grandVariance < 0 ? 'text-destructive' : 'text-muted-foreground',
        )}>
          {grandVariance >= 0 ? '' : '−'}{sym}{fmt(Math.abs(grandVariance))}
        </div>
        <div className="w-24 shrink-0 px-3 py-3 text-right text-sm font-mono border-l border-border/30 text-muted-foreground">
          100%
        </div>
        <div className="w-44 shrink-0 border-l border-border/30" />
        <div className="w-8 shrink-0" />
      </div>
    </div>
  )
}
