'use client'

import { useRequestSignatures } from '@/hooks/useSplits'
import { Send, X, AlertTriangle } from 'lucide-react'
import type { Split } from '@/hooks/useSplits'

export function RequestSignaturesModal({
  trackId,
  trackTitle,
  projectId,
  splits,
  onClose,
}: {
  trackId: string
  trackTitle: string
  projectId: string
  splits: Split[]
  onClose: () => void
}) {
  const request = useRequestSignatures(projectId)

  const total = splits.reduce((s, x) => s + x.percentage, 0)
  const isValid = Math.abs(total - 100) <= 0.01

  async function handleSend() {
    await request.mutateAsync(trackId)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm max-h-[85svh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-primary" />
            <h2 className="font-semibold">Request signatures</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors rounded-md">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Each collaborator will receive an email with a signing link for{' '}
            <strong className="text-foreground">{trackTitle}</strong>.
          </p>

          {/* Split summary */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
            {splits.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.collaborator.display_name ?? 'Unknown'}</span>
                <span className="font-medium tabular-nums">{s.percentage.toFixed(2)}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted-foreground">Total</span>
              <span className={total === 100 ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                {total.toFixed(2)}%
              </span>
            </div>
          </div>

          {!isValid && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              Splits must total 100% before requesting signatures.
            </div>
          )}

          <div className="bg-amber-400/10 rounded-md p-3 text-xs text-amber-700 dark:text-amber-400">
            Sending a new signature request will void any previously pending signatures.
          </div>

          {request.error && (
            <p className="text-destructive text-sm">{(request.error as Error).message}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!isValid || request.isPending}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {request.isPending ? 'Sending…' : 'Send requests'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
