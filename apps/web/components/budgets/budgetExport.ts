import * as XLSX from 'xlsx'
import type { LineItem } from '@/hooks/useBudgets'

type Budget = {
  title: string
  total_amount: number
  currency: string
  ai_advice?: string | null
}

function getSymbol(currency: string) {
  return currency === 'USD' ? '$'
    : currency === 'EUR' ? '€'
    : currency === 'GBP' ? '£'
    : currency
}

function buildWorksheet(budget: Budget, lineItems: LineItem[]) {
  const sym = getSymbol(budget.currency)

  const rows: (string | number)[][] = []

  rows.push([budget.title])
  rows.push([`Total Budget: ${sym}${budget.total_amount.toLocaleString()}`])
  rows.push([])
  rows.push(['Category', 'Item', 'Budgeted', 'Actual', 'Variance', '% of Total', 'Notes'])

  // Group by category
  const order: string[] = []
  const map: Record<string, LineItem[]> = {}
  for (const item of lineItems) {
    if (!map[item.category]) { map[item.category] = []; order.push(item.category) }
    map[item.category].push(item)
  }

  const grandBudgeted = lineItems.reduce((s, i) => s + (i.budgeted ?? 0), 0)

  for (const cat of order) {
    const items = map[cat]
    const catBudgeted = items.reduce((s, i) => s + (i.budgeted ?? 0), 0)
    const catActual = items.reduce((s, i) => s + (i.actual ?? 0), 0)

    // Category header row
    rows.push([cat, '', catBudgeted, catActual, catBudgeted - catActual, grandBudgeted > 0 ? catBudgeted / grandBudgeted : 0, ''])

    for (const item of items) {
      const budgeted = item.budgeted ?? 0
      const actual = item.actual ?? 0
      rows.push([
        '',
        item.label,
        budgeted,
        actual,
        budgeted - actual,
        grandBudgeted > 0 ? budgeted / grandBudgeted : 0,
        item.notes ?? '',
      ])
    }

    rows.push([]) // blank row between categories
  }

  rows.push(['TOTAL', '', grandBudgeted, lineItems.reduce((s, i) => s + (i.actual ?? 0), 0), grandBudgeted - lineItems.reduce((s, i) => s + (i.actual ?? 0), 0), 1, ''])

  return rows
}

export function exportXLSX(budget: Budget, lineItems: LineItem[]) {
  const rows = buildWorksheet(budget, lineItems)
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 28 }, // Category
    { wch: 36 }, // Item
    { wch: 14 }, // Budgeted
    { wch: 14 }, // Actual
    { wch: 14 }, // Variance
    { wch: 12 }, // % of Total
    { wch: 32 }, // Notes
  ]

  // Format numeric columns as currency
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (const col of [2, 3, 4]) { // C, D, E
      const addr = XLSX.utils.encode_cell({ r, c: col })
      const cell = ws[addr]
      if (cell && typeof cell.v === 'number') {
        cell.z = `${getSymbol(budget.currency)}#,##0.00`
      }
    }
    // % column
    const pctAddr = XLSX.utils.encode_cell({ r, c: 5 })
    const pctCell = ws[pctAddr]
    if (pctCell && typeof pctCell.v === 'number') {
      pctCell.z = '0.0%'
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Budget')

  if (budget.ai_advice) {
    const adviceWs = XLSX.utils.aoa_to_sheet([
      ['AI Budget Advice'],
      [],
      [budget.ai_advice],
    ])
    adviceWs['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(wb, adviceWs, 'AI Insights')
  }

  XLSX.writeFile(wb, `${budget.title.replace(/[/\\:*?"<>|]/g, '-')}.xlsx`)
}

export function exportCSV(budget: Budget, lineItems: LineItem[]) {
  const rows = buildWorksheet(budget, lineItems)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${budget.title.replace(/[/\\:*?"<>|]/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
