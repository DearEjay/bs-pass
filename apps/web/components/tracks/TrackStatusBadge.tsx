import { cn } from '@/lib/utils'
import type { TrackStatus } from '@/hooks/useTracks'

const STATUS_CONFIG: Record<TrackStatus, { label: string; color: string; dot: string }> = {
  not_started: { label: 'Not Started / Demo', color: 'text-muted-foreground border-border bg-transparent',  dot: 'bg-gray-400' },
  writing:     { label: 'Writing',            color: 'text-amber-600 border-amber-200 bg-amber-50',         dot: 'bg-amber-500' },
  recording:   { label: 'Recording',          color: 'text-orange-600 border-orange-200 bg-orange-50',      dot: 'bg-orange-500' },
  mixing:      { label: 'Mixing',             color: 'text-blue-600 border-blue-200 bg-blue-50',            dot: 'bg-blue-500' },
  mastering:   { label: 'Mastering',          color: 'text-violet-600 border-violet-200 bg-violet-50',      dot: 'bg-violet-500' },
  released:    { label: 'Released',           color: 'text-teal-700 border-teal-200 bg-teal-50',            dot: 'bg-teal-600' },
}

export function TrackStatusBadge({
  status,
  className,
}: {
  status: TrackStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started
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
