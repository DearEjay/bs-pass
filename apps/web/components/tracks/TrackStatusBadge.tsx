import { cn } from '@/lib/utils'
import type { TrackStatus } from '@/hooks/useTracks'

const STATUS_CONFIG: Record<TrackStatus, { label: string; color: string; dot: string }> = {
  draft:      { label: 'Draft',      color: 'text-muted-foreground border-border bg-transparent',    dot: 'bg-gray-400' },
  recording:  { label: 'Recording',  color: 'text-orange-600 border-orange-200 bg-orange-50',        dot: 'bg-orange-500' },
  recorded:   { label: 'Recorded',   color: 'text-orange-800 border-orange-300 bg-orange-100',       dot: 'bg-orange-700' },
  mixing:     { label: 'Mixing',     color: 'text-blue-600 border-blue-200 bg-blue-50',              dot: 'bg-blue-500' },
  mixed:      { label: 'Mixed',      color: 'text-blue-800 border-blue-300 bg-blue-100',             dot: 'bg-blue-700' },
  mastering:  { label: 'Mastering',  color: 'text-violet-600 border-violet-200 bg-violet-50',        dot: 'bg-violet-500' },
  mastered:   { label: 'Mastered',   color: 'text-violet-800 border-violet-300 bg-violet-100',       dot: 'bg-violet-700' },
  released:   { label: 'Released',   color: 'text-teal-700 border-teal-200 bg-teal-50',              dot: 'bg-teal-600' },
}

export function TrackStatusBadge({
  status,
  className,
}: {
  status: TrackStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium',
      config.color,
      className,
    )}>
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
