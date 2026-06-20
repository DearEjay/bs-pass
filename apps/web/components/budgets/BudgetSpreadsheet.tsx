'use client'

import { useMemo, useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { useUpdateLineItem, type LineItem } from '@/hooks/useBudgets'
import { Loader2, CheckCircle2 } from 'lucide-react'
import '@fortune-sheet/react/dist/index.css'

// ── Lazy-load Fortune Sheet (requires browser APIs) ───────────────────────────

const Workbook = dynamic(
  () => import('@fortune-sheet/react').then(m => m.Workbook),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-white" style={{ height: 520 }}>
        <Loader2 size={22} className="animate-spin text-gray-400" />
      </div>
    ),
  },
)

// ── Row metadata (parallel array to sheet rows) ───────────────────────────────

type RowMeta =
  | { type: 'header' }
  | { type: 'category'; name: string }
  | { type: 'item'; itemId: string }
  | { type: 'subtotal' }
  | { type: 'total' }

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(lineItems: LineItem[]): { sheet: object; rowMeta: RowMeta[] } {
  // Group items by category preserving insertion order
  const grouped = new Map<string, LineItem[]>()
  for (const item of lineItems) {
    const cat = item.category || 'Miscellaneous'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  }
  for (const items of grouped.values()) {
    items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }

  // Pre-compute layout so we know the TOTAL row index before building formulas
  type LayoutRow =
    | { type: 'header' }
    | { type: 'category'; name: string }
    | { type: 'item'; item: LineItem }
    | { type: 'subtotal'; firstItemR: number; lastItemR: number }
    | { type: 'total'; subtotalRs: number[] }

  const layout: LayoutRow[] = [{ type: 'header' }]
  const subtotalRs: number[] = []

  for (const [cat, items] of grouped) {
    layout.push({ type: 'category', name: cat })
    const firstItemR = layout.length
    for (const item of items) layout.push({ type: 'item', item })
    const lastItemR = layout.length - 1
    subtotalRs.push(layout.length)
    layout.push({ type: 'subtotal', firstItemR, lastItemR })
  }
  const totalR = layout.length
  layout.push({ type: 'total', subtotalRs })
  const totalExcelR = totalR + 1 // Excel formulas are 1-indexed

  // Build celldata + merge map + row meta
  // Pre-compute grand totals so % of Total can be seeded for initial render
  const grandB = lineItems.reduce((s, i) => s + Number(i.budgeted ?? 0), 0)
  const grandA = lineItems.reduce((s, i) => s + Number(i.actual ?? 0), 0)

  const celldata: object[] = []
  const merge: Record<string, { r: number; c: number; rs: number; cs: number }> = {}
  const rowMeta: RowMeta[] = []

  for (let r = 0; r < layout.length; r++) {
    const info = layout[r]
    const er = r + 1 // Excel row number (1-indexed)

    switch (info.type) {
      case 'header': {
        rowMeta.push({ type: 'header' })
        const labels = ['Item', 'Budgeted', 'Actual', 'Variance', '% of Total', 'Notes']
        labels.forEach((v, c) => {
          celldata.push({ r, c, v: { v, m: v, t: 's', bl: 1, bg: '#e8eaf0', fc: '#374151', ht: c === 0 ? 0 : 2, vt: 1 } })
        })
        break
      }
      case 'category': {
        rowMeta.push({ type: 'category', name: info.name })
        celldata.push({ r, c: 0, v: { v: info.name, m: info.name, t: 's', bl: 1, bg: '#f1f5f9', fc: '#1e293b', vt: 1 } })
        merge[`${r}_0`] = { r, c: 0, rs: 1, cs: 6 }
        break
      }
      case 'item': {
        const { item } = info
        rowMeta.push({ type: 'item', itemId: item.id })
        const b = Number(item.budgeted ?? 0)
        const a = Number(item.actual ?? 0)
        const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        celldata.push({ r, c: 0, v: { v: item.label || '', m: item.label || '', t: 's', vt: 1 } })
        celldata.push({ r, c: 1, v: { v: b, m: fmt(b), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, ht: 2, vt: 1 } })
        celldata.push({ r, c: 2, v: { v: a, m: fmt(a), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, ht: 2, vt: 1 } })
        // Variance = Budgeted – Actual (auto-recalculates on edit)
        const variance = b - a
        celldata.push({ r, c: 3, v: { f: `=B${er}-C${er}`, v: variance, m: fmt(variance), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, ht: 2, vt: 1 } })
        // % of Total references the grand-total cell absolutely (seeded for initial render)
        const pct = grandB > 0 ? b / grandB : 0
        celldata.push({ r, c: 4, v: { f: `=IF($B$${totalExcelR}>0,B${er}/$B$${totalExcelR},0)`, v: pct, m: (pct * 100).toFixed(1) + '%', t: 'n', ct: { fa: '0.0%', t: 'n' }, ht: 2, vt: 1 } })
        celldata.push({ r, c: 5, v: { v: item.notes || '', m: item.notes || '', t: 's', vt: 1 } })
        break
      }
      case 'subtotal': {
        rowMeta.push({ type: 'subtotal' })
        const f1 = info.firstItemR + 1
        const f2 = info.lastItemR + 1
        // Pre-calculate subtotal values for initial display
        const itemsInRange = lineItems.filter((item) => {
          const itemR = layout.findIndex(l => l.type === 'item' && l.item.id === item.id)
          return itemR >= info.firstItemR && itemR <= info.lastItemR
        })
        const subB = itemsInRange.reduce((s, i) => s + Number(i.budgeted ?? 0), 0)
        const subA = itemsInRange.reduce((s, i) => s + Number(i.actual ?? 0), 0)
        const fmtS = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        celldata.push({ r, c: 0, v: { v: 'Subtotal', m: 'Subtotal', t: 's', it: 1, fc: '#94a3b8', bg: '#f8fafc', vt: 1 } })
        celldata.push({ r, c: 1, v: { f: `=SUM(B${f1}:B${f2})`, v: subB, m: fmtS(subB), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, bl: 1, bg: '#f8fafc', ht: 2, vt: 1 } })
        celldata.push({ r, c: 2, v: { f: `=SUM(C${f1}:C${f2})`, v: subA, m: fmtS(subA), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, bl: 1, bg: '#f8fafc', ht: 2, vt: 1 } })
        celldata.push({ r, c: 3, v: { f: `=B${er}-C${er}`, v: subB - subA, m: fmtS(subB - subA), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, bl: 1, bg: '#f8fafc', ht: 2, vt: 1 } })
        celldata.push({ r, c: 4, v: { v: '', m: '', t: 's', bg: '#f8fafc' } })
        celldata.push({ r, c: 5, v: { v: '', m: '', t: 's', bg: '#f8fafc' } })
        break
      }
      case 'total': {
        rowMeta.push({ type: 'total' })
        const bRef = info.subtotalRs.map(sr => `B${sr + 1}`).join(',')
        const cRef = info.subtotalRs.map(sr => `C${sr + 1}`).join(',')
        const fmtT = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        celldata.push({ r, c: 0, v: { v: 'TOTAL', m: 'TOTAL', t: 's', bl: 1, bg: '#dbeafe', fc: '#1e40af', vt: 1 } })
        celldata.push({ r, c: 1, v: { f: `=SUM(${bRef})`, v: grandB, m: fmtT(grandB), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, bl: 1, bg: '#dbeafe', fc: '#1e40af', ht: 2, vt: 1 } })
        celldata.push({ r, c: 2, v: { f: `=SUM(${cRef})`, v: grandA, m: fmtT(grandA), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, bl: 1, bg: '#dbeafe', fc: '#1e40af', ht: 2, vt: 1 } })
        celldata.push({ r, c: 3, v: { f: `=B${er}-C${er}`, v: grandB - grandA, m: fmtT(grandB - grandA), t: 'n', ct: { fa: '#,##0.00', t: 'n' }, bl: 1, bg: '#dbeafe', fc: '#1e40af', ht: 2, vt: 1 } })
        celldata.push({ r, c: 4, v: { v: '100.0%', m: '100.0%', t: 's', bl: 1, bg: '#dbeafe', fc: '#1e40af', ht: 2, vt: 1 } })
        celldata.push({ r, c: 5, v: { v: '', m: '', t: 's', bg: '#dbeafe' } })
        break
      }
    }
  }

  const sheet = {
    name: 'Budget',
    id: 'budget-sheet',
    status: 1,
    index: 0,
    order: 0,
    celldata,
    config: {
      merge,
      columnlen: { 0: 220, 1: 130, 2: 130, 3: 110, 4: 100, 5: 200 },
      rowlen: Object.fromEntries(layout.map((l, i) => [i, l.type === 'header' ? 34 : 28])),
    },
    row: layout.length + 20,
    column: 6,
    defaultRowHeight: 28,
    defaultColWidth: 120,
    showGridLines: 1,
    zoomRatio: 1,
  }

  return { sheet, rowMeta }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  budgetId: string
  lineItems: LineItem[]
  totalAmount: number
  currency: string
}

const EDITABLE_COLS = new Set([0, 1, 2, 5])
const FIELD_MAP: Record<number, string> = { 0: 'label', 1: 'budgeted', 2: 'actual', 5: 'notes' }
const NUMERIC_FIELDS = new Set(['budgeted', 'actual'])

export function BudgetSpreadsheet({ budgetId, lineItems }: Props) {
  const updateLineItem = useUpdateLineItem(budgetId)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Compute initial sheet data once per budget (re-initialises on navigation between budgets)
  const { initialData, rowMeta } = useMemo(() => {
    const { sheet, rowMeta } = buildSheet(lineItems)
    return { initialData: [sheet], rowMeta }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId])

  const rowMetaRef = useRef(rowMeta)
  rowMetaRef.current = rowMeta

  const prevCells = useRef<Map<string, unknown> | null>(null)
  const pending = useRef<{ itemId: string; field: string; value: unknown }[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    const changes = pending.current.splice(0)
    if (!changes.length) return

    // Merge: last write wins per (itemId, field)
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
          update[k] = NUMERIC_FIELDS.has(k) ? parseFloat(String(v)) || 0 : String(v ?? '')
        }
        return updateLineItem.mutateAsync(update as Parameters<typeof updateLineItem.mutateAsync>[0])
      }),
    )
      .then(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) })
      .catch(() => setSaveStatus('idle'))
  }, [updateLineItem])

  const handleChange = useCallback((data: Record<string, unknown>[]) => {
    const cells = (data?.[0] as Record<string, unknown> | undefined)?.celldata as Record<string, unknown>[] | undefined
    if (!cells) return

    // Extract current editable-column values for item rows only
    const current = new Map<string, unknown>()
    for (const cell of cells) {
      const c = cell.c as number
      if (!EDITABLE_COLS.has(c)) continue
      const meta = rowMetaRef.current[cell.r as number]
      if (!meta || meta.type !== 'item') continue
      current.set(`${cell.r}_${c}`, (cell.v as Record<string, unknown> | null)?.v ?? null)
    }

    // First invocation: seed baseline without queuing saves
    if (prevCells.current === null) {
      prevCells.current = current
      return
    }

    // Diff vs previous; queue any changes
    for (const [key, val] of current) {
      if (val !== prevCells.current.get(key)) {
        const [rStr, cStr] = key.split('_')
        const meta = rowMetaRef.current[parseInt(rStr)]
        if (meta?.type === 'item') {
          pending.current.push({
            itemId: (meta as Extract<RowMeta, { type: 'item' }>).itemId,
            field: FIELD_MAP[parseInt(cStr)],
            value: val,
          })
        }
      }
    }

    prevCells.current = current

    if (pending.current.length > 0) {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, 800)
    }
  }, [flush])

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      {/* Auto-save indicator */}
      {saveStatus !== 'idle' && (
        <div className="absolute top-10 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-xs pointer-events-none">
          {saveStatus === 'saving'
            ? <><Loader2 size={11} className="animate-spin text-gray-400" /><span className="text-gray-500">Saving…</span></>
            : <><CheckCircle2 size={11} className="text-emerald-500" /><span className="text-emerald-600">Saved</span></>
          }
        </div>
      )}

      <div style={{ height: 'calc(100vh - 400px)', minHeight: 520 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Workbook
          {...({ data: initialData, onChange: handleChange, showSheetTabs: false, lang: 'en' } as any)}
        />
      </div>
    </div>
  )
}
