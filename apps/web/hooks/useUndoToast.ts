'use client'

import { create } from 'zustand'

export interface UndoToastItem {
  id: string
  message: string
  onUndo: () => Promise<void> | void
  expiresAt: number
}

interface UndoToastStore {
  toasts: UndoToastItem[]
  push: (message: string, onUndo: () => Promise<void> | void, durationMs?: number) => string
  dismiss: (id: string) => void
  tick: () => void
}

export const useUndoToastStore = create<UndoToastStore>((set, get) => ({
  toasts: [],
  push(message, onUndo, durationMs = 5000) {
    const id = crypto.randomUUID()
    set(s => ({
      toasts: [...s.toasts, { id, message, onUndo, expiresAt: Date.now() + durationMs }],
    }))
    setTimeout(() => get().dismiss(id), durationMs)
    return id
  },
  dismiss(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },
  tick() {
    const now = Date.now()
    set(s => ({ toasts: s.toasts.filter(t => t.expiresAt > now) }))
  },
}))
