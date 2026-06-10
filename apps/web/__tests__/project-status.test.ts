import { describe, it, expect } from 'vitest'
import { computeProjectStatus } from '@shared/project-status'

const noSplits: Array<{ signed_at: string | null }> = []
const signedSplits = [{ signed_at: '2026-06-08T00:00:00Z' }, { signed_at: '2026-06-08T00:00:00Z' }]
const unsignedSplits = [{ signed_at: '2026-06-08T00:00:00Z' }, { signed_at: null }]

function tracks(...statuses: string[]) {
  return statuses.map(s => ({ current_status: s }))
}

describe('computeProjectStatus', () => {
  // ── Pre-production ──────────────────────────────────────────────────────────
  it('returns in_pre_production with no tracks', () => {
    expect(computeProjectStatus([], noSplits)).toBe('in_pre_production')
  })

  it('returns in_pre_production when all tracks are not_started', () => {
    expect(computeProjectStatus(tracks('not_started', 'not_started'), noSplits)).toBe('in_pre_production')
  })

  // ── In production ───────────────────────────────────────────────────────────
  it('returns in_production when all tracks are writing', () => {
    expect(computeProjectStatus(tracks('writing', 'writing'), noSplits)).toBe('in_production')
  })

  it('returns in_production when all tracks are recording', () => {
    expect(computeProjectStatus(tracks('recording', 'recording'), noSplits)).toBe('in_production')
  })

  it('mix of released and not_started → in_production', () => {
    expect(computeProjectStatus(tracks('released', 'not_started'), noSplits)).toBe('in_production')
  })

  it('mix of recording and not_started → in_production', () => {
    expect(computeProjectStatus(tracks('recording', 'not_started'), noSplits)).toBe('in_production')
  })

  it('mix of mastering and not_started → in_production', () => {
    expect(computeProjectStatus(tracks('mastering', 'not_started'), noSplits)).toBe('in_production')
  })

  it('mix of mixing and recording → in_production', () => {
    expect(computeProjectStatus(tracks('mixing', 'recording'), noSplits)).toBe('in_production')
  })

  // ── Post-production ─────────────────────────────────────────────────────────
  it('returns in_post_production when all tracks are mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mixing'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when least advanced is mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mastering'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when all mastering but splits unsigned', () => {
    expect(computeProjectStatus(tracks('mastering', 'mastering'), unsignedSplits)).toBe('in_post_production')
  })

  // ── Ready for release ───────────────────────────────────────────────────────
  it('returns ready_for_release when all mastering and no splits exist', () => {
    expect(computeProjectStatus(tracks('mastering', 'mastering'), noSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when all mastering and all splits signed', () => {
    expect(computeProjectStatus(tracks('mastering', 'mastering'), signedSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when mix of mastering/released and splits signed', () => {
    expect(computeProjectStatus(tracks('mastering', 'released'), signedSplits)).toBe('ready_for_release')
  })

  // ── Released ────────────────────────────────────────────────────────────────
  it('returns released when all tracks are released', () => {
    expect(computeProjectStatus(tracks('released', 'released'), signedSplits)).toBe('released')
  })

  it('returns released when single track is released', () => {
    expect(computeProjectStatus(tracks('released'), noSplits)).toBe('released')
  })
})
