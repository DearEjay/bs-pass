import { cn } from '@/lib/utils'
import type { TrackStatus } from '@/hooks/useTracks'

const STATUS_CONFIG: Record<TrackStatus, { label: string; color: string }> = {
  draft:      { label: 'Draft',      color: 'text-muted-foreground border-border bg-transparent' },
  recording:  { label: 'Recording',  color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  recorded:   { label: 'Recorded',   color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  mixing:     { label: 'Mixing',     color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  mixed:      { label: 'Mixed',      color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
  mastering:  { label: 'Mastering',  color: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
  mastered:   { label: 'Mastered',   color: 'text-green-400 border-green-400/30 bg-green-400/10' },
  released:   { label: 'Released',   color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
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
