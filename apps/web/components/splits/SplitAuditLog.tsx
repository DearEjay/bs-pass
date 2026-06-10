'use client'

import { useSplitAuditLog } from '@/hooks/useSplits'
import { History, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  splits_updated:                    { label: 'Splits updated',               color: 'text-blue-500' },
  splits_auto_populated:             { label: 'Auto-populated from credits',   color: 'text-primary' },
  splits_changed_signatures_voided:  { label: 'Splits changed — sigs voided', color: 'text-destructive' },
  signature_request_sent:            { label: 'Signatures requested',          color: 'text-amber-500' },
  split_signed:                      { label: 'Signature collected',           color: 'text-emerald-500' },
  pdf_generated:                     { label: 'PDF generated',                 color: 'text-purple-500' },
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function SplitAuditLog({ trackId }: { trackId: string }) {
  const { data: entries = [], isLoading } = useSplitAuditLog(trackId)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return null
  if (entries.length === 0) return null

  const shown = expanded ? entries : entries.slice(0, 4)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <History size={13} />
        Activity
      </div>

      <div className="space-y-0">
        {shown.map((entry, i) => {
          const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'text-muted-foreground' }
          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-start gap-3 py-2',
                i < shown.length - 1 && 'border-b border-border/50',
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', meta.color.replace('text-', 'bg-'))} />
              <div className="flex-1 min-w-0">
                <span className={cn('text-xs font-medium', meta.color)}>{meta.label}</span>
                {entry.actor_type === 'user' && (
                  <span className="text-xs text-muted-foreground"> · by you</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{timeAgo(entry.created_at)}</span>
            </div>
          )
        })}
      </div>

      {entries.length > 4 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : `Show ${entries.length - 4} more`}
        </button>
      )}
    </div>
  )
}
