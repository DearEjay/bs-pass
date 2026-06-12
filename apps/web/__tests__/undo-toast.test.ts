import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useUndoToastStore } from '@/hooks/useUndoToast'

describe('useUndoToastStore', () => {
  beforeEach(() => {
    useUndoToastStore.setState({ toasts: [] })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts with empty toasts array', () => {
    expect(useUndoToastStore.getState().toasts).toHaveLength(0)
  })

  // ── push ──────────────────────────────────────────────────────────────────

  it('push adds a toast', () => {
    useUndoToastStore.getState().push('Track deleted', vi.fn())
    expect(useUndoToastStore.getState().toasts).toHaveLength(1)
  })

  it('push returns a non-empty string id', () => {
    const id = useUndoToastStore.getState().push('msg', vi.fn())
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('push returns unique ids for successive calls', () => {
    const id1 = useUndoToastStore.getState().push('First', vi.fn())
    const id2 = useUndoToastStore.getState().push('Second', vi.fn())
    expect(id1).not.toBe(id2)
  })

  it('toast has correct message', () => {
    useUndoToastStore.getState().push('Track "Summer" deleted', vi.fn())
    const { toasts } = useUndoToastStore.getState()
    expect(toasts[0].message).toBe('Track "Summer" deleted')
  })

  it('toast stores the onUndo callback', () => {
    const onUndo = vi.fn()
    useUndoToastStore.getState().push('msg', onUndo)
    const { toasts } = useUndoToastStore.getState()
    expect(toasts[0].onUndo).toBe(onUndo)
  })

  it('toast has expiresAt in the future', () => {
    const before = Date.now()
    useUndoToastStore.getState().push('msg', vi.fn(), 5000)
    const { toasts } = useUndoToastStore.getState()
    expect(toasts[0].expiresAt).toBeGreaterThanOrEqual(before + 5000)
  })

  it('push uses default 5000ms duration', () => {
    const before = Date.now()
    useUndoToastStore.getState().push('msg', vi.fn())
    const { toasts } = useUndoToastStore.getState()
    expect(toasts[0].expiresAt).toBeGreaterThanOrEqual(before + 5000)
  })

  it('multiple toasts can coexist', () => {
    useUndoToastStore.getState().push('First', vi.fn())
    useUndoToastStore.getState().push('Second', vi.fn())
    useUndoToastStore.getState().push('Third', vi.fn())
    expect(useUndoToastStore.getState().toasts).toHaveLength(3)
  })

  // ── dismiss ───────────────────────────────────────────────────────────────

  it('dismiss removes the toast with the matching id', () => {
    const id = useUndoToastStore.getState().push('msg', vi.fn())
    useUndoToastStore.getState().dismiss(id)
    expect(useUndoToastStore.getState().toasts).toHaveLength(0)
  })

  it('dismiss does not affect other toasts', () => {
    const id1 = useUndoToastStore.getState().push('First', vi.fn())
    useUndoToastStore.getState().push('Second', vi.fn())
    useUndoToastStore.getState().dismiss(id1)
    const { toasts } = useUndoToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Second')
  })

  it('dismiss with unknown id is a no-op', () => {
    useUndoToastStore.getState().push('msg', vi.fn())
    useUndoToastStore.getState().dismiss('non-existent-id')
    expect(useUndoToastStore.getState().toasts).toHaveLength(1)
  })

  it('dismiss after dismiss (double dismiss) is safe', () => {
    const id = useUndoToastStore.getState().push('msg', vi.fn())
    useUndoToastStore.getState().dismiss(id)
    expect(() => useUndoToastStore.getState().dismiss(id)).not.toThrow()
    expect(useUndoToastStore.getState().toasts).toHaveLength(0)
  })

  // ── auto-expire via setTimeout ─────────────────────────────────────────────

  it('toast auto-expires after durationMs', () => {
    useUndoToastStore.getState().push('msg', vi.fn(), 5000)
    expect(useUndoToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(5001)
    expect(useUndoToastStore.getState().toasts).toHaveLength(0)
  })

  it('toast is still present just before durationMs elapses', () => {
    useUndoToastStore.getState().push('msg', vi.fn(), 5000)
    vi.advanceTimersByTime(4999)
    expect(useUndoToastStore.getState().toasts).toHaveLength(1)
  })

  it('each toast has its own independent expiry timer', () => {
    useUndoToastStore.getState().push('short', vi.fn(), 1000)
    useUndoToastStore.getState().push('long', vi.fn(), 10000)
    vi.advanceTimersByTime(1001)
    const { toasts } = useUndoToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('long')
  })

  it('manually dismissed toast timer firing is a no-op', () => {
    const id = useUndoToastStore.getState().push('msg', vi.fn(), 5000)
    useUndoToastStore.getState().dismiss(id)
    expect(() => vi.advanceTimersByTime(5001)).not.toThrow()
    expect(useUndoToastStore.getState().toasts).toHaveLength(0)
  })

  // ── tick ──────────────────────────────────────────────────────────────────

  it('tick removes toasts past their expiresAt', () => {
    useUndoToastStore.getState().push('msg', vi.fn(), 1000)
    vi.advanceTimersByTime(2000)
    useUndoToastStore.getState().tick()
    expect(useUndoToastStore.getState().toasts).toHaveLength(0)
  })

  it('tick keeps unexpired toasts', () => {
    useUndoToastStore.getState().push('msg', vi.fn(), 10000)
    vi.advanceTimersByTime(1000)
    useUndoToastStore.getState().tick()
    expect(useUndoToastStore.getState().toasts).toHaveLength(1)
  })

  it('tick is safe on an empty store', () => {
    expect(() => useUndoToastStore.getState().tick()).not.toThrow()
  })

  it('tick removes only expired toasts when multiple exist', () => {
    useUndoToastStore.getState().push('expired', vi.fn(), 500)
    useUndoToastStore.getState().push('alive', vi.fn(), 5000)
    vi.advanceTimersByTime(1000)
    useUndoToastStore.getState().tick()
    const { toasts } = useUndoToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('alive')
  })
})
