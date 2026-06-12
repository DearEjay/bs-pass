'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => { setMounted(true) }, [])

  function handleOpen() {
    if (disabled) return
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
    setOpen(o => !o)
  }

  // Close on page scroll/resize — but NOT when the scroll originates inside the menu itself
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    function handleScroll(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const menu = open && rect && mounted
    ? createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 overflow-y-auto max-h-60"
            style={{ top: rect.bottom + 4, left: rect.left, width: rect.width }}
          >
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
        </>,
        document.body,
      )
    : null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center justify-between px-2 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring',
          disabled && 'opacity-50 cursor-not-allowed',
          !selected && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? '—'}</span>
        <ChevronDown size={12} className="shrink-0 ml-1 opacity-60" />
      </button>
      {menu}
    </div>
  )
}
