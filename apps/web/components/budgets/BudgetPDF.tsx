'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { LineItem } from '@/hooks/useBudgets'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 9, color: '#111' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666', marginBottom: 20 },
  header: {
    flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd',
    paddingBottom: 4, marginBottom: 6, fontFamily: 'Helvetica-Bold', fontSize: 8,
    color: '#666',
  },
  catHeader: {
    flexDirection: 'row', backgroundColor: '#f4f4f5', padding: '5 4',
    marginTop: 8, fontFamily: 'Helvetica-Bold',
  },
  row: { flexDirection: 'row', padding: '3 4', borderBottomWidth: 0.5, borderColor: '#eee' },
  totalRow: {
    flexDirection: 'row', padding: '5 4', borderTopWidth: 1.5, borderColor: '#111',
    marginTop: 4, fontFamily: 'Helvetica-Bold',
  },
  col0: { flex: 1, paddingRight: 6 },
  col1: { width: 70, textAlign: 'right' },
  col2: { width: 70, textAlign: 'right' },
  col3: { width: 70, textAlign: 'right' },
  col4: { width: 50, textAlign: 'right' },
  col5: { width: 90, paddingLeft: 6, color: '#666' },
  advice: { marginTop: 24, borderTopWidth: 1, borderColor: '#ddd', paddingTop: 14 },
  adviceTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 6 },
  adviceText: { lineHeight: 1.5, color: '#444' },
  positive: { color: '#16a34a' },
  negative: { color: '#dc2626' },
})

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getSymbol(currency: string) {
  return currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency
}

export function BudgetPDFDoc({
  budget, lineItems,
}: {
  budget: { title: string; total_amount: number; currency: string; ai_advice?: string | null; created_at: string }
  lineItems: LineItem[]
}) {
  const sym = getSymbol(budget.currency)

  const order: string[] = []
  const map: Record<string, LineItem[]> = {}
  for (const item of lineItems) {
    if (!map[item.category]) { map[item.category] = []; order.push(item.category) }
    map[item.category].push(item)
  }

  const grandBudgeted = lineItems.reduce((s, i) => s + (i.budgeted ?? 0), 0)
  const grandActual = lineItems.reduce((s, i) => s + (i.actual ?? 0), 0)
  const grandVariance = grandBudgeted - grandActual

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{budget.title}</Text>
        <Text style={styles.subtitle}>
          Total Budget: {sym}{budget.total_amount.toLocaleString()} · {budget.currency} · Created {new Date(budget.created_at).toLocaleDateString()}
        </Text>

        {/* Column headers */}
        <View style={styles.header}>
          <Text style={styles.col0}>Item</Text>
          <Text style={styles.col1}>Budgeted</Text>
          <Text style={styles.col2}>Actual</Text>
          <Text style={styles.col3}>Variance</Text>
          <Text style={styles.col4}>% Total</Text>
          <Text style={styles.col5}>Notes</Text>
        </View>

        {/* Categories */}
        {order.map(cat => {
          const items = map[cat]
          const catBudgeted = items.reduce((s, i) => s + (i.budgeted ?? 0), 0)
          const catActual = items.reduce((s, i) => s + (i.actual ?? 0), 0)
          const catVariance = catBudgeted - catActual

          return (
            <View key={cat}>
              <View style={styles.catHeader}>
                <Text style={styles.col0}>{cat}</Text>
                <Text style={styles.col1}>{sym}{fmt(catBudgeted)}</Text>
                <Text style={styles.col2}>{sym}{fmt(catActual)}</Text>
                <Text style={[styles.col3, catVariance < 0 ? styles.negative : styles.positive]}>
                  {catVariance >= 0 ? '' : '−'}{sym}{fmt(Math.abs(catVariance))}
                </Text>
                <Text style={styles.col4}>
                  {grandBudgeted > 0 ? ((catBudgeted / grandBudgeted) * 100).toFixed(1) : '0.0'}%
                </Text>
                <Text style={styles.col5} />
              </View>

              {items.map(item => {
                const budgeted = item.budgeted ?? 0
                const actual = item.actual ?? 0
                const variance = budgeted - actual
                return (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.col0}>  {item.label}</Text>
                    <Text style={styles.col1}>{sym}{fmt(budgeted)}</Text>
                    <Text style={styles.col2}>{sym}{fmt(actual)}</Text>
                    <Text style={[styles.col3, variance < 0 ? styles.negative : styles.positive]}>
                      {variance >= 0 ? '' : '−'}{sym}{fmt(Math.abs(variance))}
                    </Text>
                    <Text style={styles.col4}>
                      {grandBudgeted > 0 ? ((budgeted / grandBudgeted) * 100).toFixed(1) : '0.0'}%
                    </Text>
                    <Text style={styles.col5}>{item.notes ?? ''}</Text>
                  </View>
                )
              })}
            </View>
          )
        })}

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text style={styles.col0}>TOTAL</Text>
          <Text style={styles.col1}>{sym}{fmt(grandBudgeted)}</Text>
          <Text style={styles.col2}>{sym}{fmt(grandActual)}</Text>
          <Text style={[styles.col3, grandVariance < 0 ? styles.negative : styles.positive]}>
            {grandVariance >= 0 ? '' : '−'}{sym}{fmt(Math.abs(grandVariance))}
          </Text>
          <Text style={styles.col4}>100%</Text>
          <Text style={styles.col5} />
        </View>

        {/* AI Advice */}
        {budget.ai_advice && (
          <View style={styles.advice}>
            <Text style={styles.adviceTitle}>AI Budget Insights</Text>
            <Text style={styles.adviceText}>{budget.ai_advice}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export async function exportPDF(
  budget: { title: string; total_amount: number; currency: string; ai_advice?: string | null; created_at: string },
  lineItems: LineItem[],
) {
  const blob = await pdf(<BudgetPDFDoc budget={budget} lineItems={lineItems} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${budget.title.replace(/[/\\:*?"<>|]/g, '-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
