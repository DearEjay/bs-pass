'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-2 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed',
          !selected && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? '—'}</span>
        <ChevronDown size={12} className="shrink-0 ml-1 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="dropdown-menu left-0 top-full mt-1 w-full min-w-[5rem]">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn('dropdown-item', opt.value === value && 'bg-accent')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
