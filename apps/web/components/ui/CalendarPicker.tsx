'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, isSameMonth, isSameDay, isToday,
  format, eachDayOfInterval, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarPickerProps {
  value: string        // ISO date string "YYYY-MM-DD" or ""
  onChange: (iso: string | null) => void
  className?: string
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function CalendarPicker({ value, onChange, className }: CalendarPickerProps) {
  const selected = value ? parseISO(value) : null
  const [viewing, setViewing] = useState(() => selected ?? new Date())

  const monthStart = startOfMonth(viewing)
  const monthEnd   = endOfMonth(viewing)
  const gridStart  = startOfWeek(monthStart)
  const gridEnd    = endOfWeek(monthEnd)
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function handleDay(day: Date) {
    if (selected && isSameDay(day, selected)) {
      onChange(null)
    } else {
      onChange(format(day, 'yyyy-MM-dd'))
    }
  }

  return (
    <div className={cn('flex flex-col w-full h-full p-2 rounded-lg border border-border bg-input select-none', className)}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <button
          type="button"
          onClick={() => setViewing(v => subMonths(v, 1))}
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11px] font-semibold tracking-wide">
          {format(viewing, 'MMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setViewing(v => addMonths(v, 1))}
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[9px] font-medium text-muted-foreground/60 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1 content-start gap-y-0.5">
        {days.map(day => {
          const inMonth   = isSameMonth(day, viewing)
          const isSelected = selected ? isSameDay(day, selected) : false
          const isTodayDay = isToday(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDay(day)}
              className={cn(
                'aspect-square w-full flex items-center justify-center rounded-md text-[10px] font-medium transition-colors',
                !inMonth && 'opacity-20 pointer-events-none',
                inMonth && !isSelected && !isTodayDay && 'text-foreground hover:bg-muted',
                isTodayDay && !isSelected && 'text-primary font-bold',
                isSelected && 'bg-primary text-primary-foreground',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Selected date label */}
      <div className="text-center text-[10px] text-muted-foreground mt-1 h-3.5">
        {selected ? format(selected, 'MMM d, yyyy') : <span className="opacity-40">No date set</span>}
      </div>
    </div>
  )
}
