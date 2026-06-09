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

  it('returns in_pre_production when all tracks are draft', () => {
    expect(computeProjectStatus(tracks('draft', 'draft'), noSplits)).toBe('in_pre_production')
  })

  // ── In production ───────────────────────────────────────────────────────────
  it('returns in_production when any track is recording', () => {
    expect(computeProjectStatus(tracks('recording', 'recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production when all tracks are recorded', () => {
    expect(computeProjectStatus(tracks('recorded', 'recorded'), noSplits)).toBe('in_production')
  })

  it('mix of released and draft → in_production (not pre-production)', () => {
    // Key case: some work done, some not started — project is actively in production
    expect(computeProjectStatus(tracks('released', 'draft'), noSplits)).toBe('in_production')
  })

  it('mix of recording and draft → in_production', () => {
    expect(computeProjectStatus(tracks('recording', 'draft'), noSplits)).toBe('in_production')
  })

  it('mix of mastered and draft → in_production', () => {
    expect(computeProjectStatus(tracks('mastered', 'draft'), noSplits)).toBe('in_production')
  })

  it('mix of post-production and production stages → in_production', () => {
    expect(computeProjectStatus(tracks('mixing', 'recording'), noSplits)).toBe('in_production')
  })

  // ── Post-production ─────────────────────────────────────────────────────────
  it('returns in_post_production when all tracks are mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mixing'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when least advanced is mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mastered'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when all mastered but splits unsigned', () => {
    expect(computeProjectStatus(tracks('mastered', 'mastered'), unsignedSplits)).toBe('in_post_production')
  })

  // ── Ready for release ───────────────────────────────────────────────────────
  it('returns ready_for_release when all mastered and no splits exist', () => {
    expect(computeProjectStatus(tracks('mastered', 'mastered'), noSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when all mastered and all splits signed', () => {
    expect(computeProjectStatus(tracks('mastered', 'mastered'), signedSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when mix of mastered/released and splits signed', () => {
    expect(computeProjectStatus(tracks('mastered', 'released'), signedSplits)).toBe('ready_for_release')
  })

  // ── Released ────────────────────────────────────────────────────────────────
  it('returns released when all tracks are released', () => {
    expect(computeProjectStatus(tracks('released', 'released'), signedSplits)).toBe('released')
  })

  it('returns released when single track is released', () => {
    expect(computeProjectStatus(tracks('released'), noSplits)).toBe('released')
  })
})
