'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterOption {
  value: string
  label: string
  dot?: string
}

export function FilterDropdown({
  value,
  onChange,
  options,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value) ?? options[0]
  const isDefault = selected.value === options[0].value

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition-colors w-full justify-between',
          isDefault
            ? 'border-border bg-background text-muted-foreground hover:text-foreground'
            : 'border-primary/50 bg-primary/5 text-primary',
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', selected.dot ?? 'bg-muted-foreground/30')} />
        <span className="truncate flex-1 text-left">{selected.label}</span>
        <ChevronDown size={11} className="shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="dropdown-menu left-0 top-full mt-1 min-w-[9rem]">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn('dropdown-item', opt.value === value && 'bg-accent')}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', opt.dot ?? 'bg-muted-foreground/30')} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
