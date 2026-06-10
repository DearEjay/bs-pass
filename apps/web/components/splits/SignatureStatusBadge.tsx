import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SplitStatus = 'pending' | 'signed' | 'voided'

export function SignatureStatusBadge({ status }: { status: SplitStatus }) {
  if (status === 'signed') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        'bg-emerald-500/10 text-emerald-600',
      )}>
        <CheckCircle2 size={11} />
        Signed
      </span>
    )
  }
  if (status === 'voided') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        'bg-destructive/10 text-destructive',
      )}>
        <XCircle size={11} />
        Voided
      </span>
    )
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      'bg-amber-400/10 text-amber-600',
    )}>
      <Clock size={11} />
      Pending
    </span>
  )
}

export function TrackSignatureStatus({ splits }: { splits: Array<{ split_status: SplitStatus }> }) {
  if (splits.length === 0) return null

  const allSigned  = splits.every(s => s.split_status === 'signed')
  const anyVoided  = splits.some(s => s.split_status === 'voided')
  const signedCount = splits.filter(s => s.split_status === 'signed').length

  if (allSigned) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
        <CheckCircle2 size={11} />
        Fully Signed
      </span>
    )
  }
  if (anyVoided) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
        <XCircle size={11} />
        Voided
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-600">
      <Clock size={11} />
      {signedCount}/{splits.length} Signed
    </span>
  )
}
