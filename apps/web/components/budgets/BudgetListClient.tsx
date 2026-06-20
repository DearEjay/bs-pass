'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBudgets } from '@/hooks/useBudgets'
import { BudgetCard } from './BudgetCard'
import { Plus, WalletMinimal, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'draft',     label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived',  label: 'Archived' },
]

export function BudgetListClient({ userId }: { userId: string }) {
  const { data: budgets, isLoading } = useBudgets(userId)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = (budgets ?? []).filter(b => {
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse h-32" />
        ))}
      </div>
    )
  }

  if (!budgets || budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <WalletMinimal size={24} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">No budgets yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first budget to plan and track spending on your music projects.
          </p>
        </div>
        <Link
          href="/budgets/new"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Create your first budget
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search budgets…"
            className="w-full pl-8 pr-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                statusFilter === f.value
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Link
          href="/budgets/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={15} />
          New budget
        </Link>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No budgets match your filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => <BudgetCard key={b.id} budget={b as Parameters<typeof BudgetCard>[0]['budget']} />)}
        </div>
      )}
    </div>
  )
}
