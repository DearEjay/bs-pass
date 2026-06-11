'use client'

import { useUndoToastStore } from '@/hooks/useUndoToast'
import { X, RotateCcw } from 'lucide-react'
import { useState } from 'react'

function UndoToast({ id, message, onUndo, expiresAt }: {
  id: string
  message: string
  onUndo: () => Promise<void> | void
  expiresAt: number
}) {
  const dismiss = useUndoToastStore(s => s.dismiss)
  const [undoing, setUndoing] = useState(false)

  const progress = Math.max(0, (expiresAt - Date.now()) / 5000)

  async function handleUndo() {
    setUndoing(true)
    try {
      await onUndo()
    } finally {
      dismiss(id)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-zinc-900 text-white rounded-lg px-4 py-3 shadow-2xl min-w-[280px] max-w-sm relative overflow-hidden">
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-white/30 transition-none"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="text-sm flex-1">{message}</span>
      <button
        onClick={handleUndo}
        disabled={undoing}
        className="flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors shrink-0 disabled:opacity-50"
      >
        <RotateCcw size={12} />
        Undo
      </button>
      <button
        onClick={() => dismiss(id)}
        className="text-white/50 hover:text-white transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function UndoToastContainer() {
  const toasts = useUndoToastStore(s => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {toasts.map(t => (
        <UndoToast key={t.id} {...t} />
      ))}
    </div>
  )
}
