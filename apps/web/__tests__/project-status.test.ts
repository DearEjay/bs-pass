import { describe, it, expect } from 'vitest'
import { computeProjectStatus } from '@shared/project-status'

const noSplits: Array<{ signed_at: string | null }> = []
const signedSplits = [{ signed_at: '2026-06-08T00:00:00Z' }, { signed_at: '2026-06-08T00:00:00Z' }]
const unsignedSplits = [{ signed_at: '2026-06-08T00:00:00Z' }, { signed_at: null }]

function tracks(...statuses: string[]) {
  return statuses.map(s => ({ current_status: s }))
}

describe('computeProjectStatus', () => {
  it('returns in_pre_production with no tracks', () => {
    expect(computeProjectStatus([], noSplits)).toBe('in_pre_production')
  })

  it('returns in_pre_production when all tracks are draft', () => {
    expect(computeProjectStatus(tracks('draft', 'draft'), noSplits)).toBe('in_pre_production')
  })

  it('returns in_pre_production when one track is recording but another is still draft', () => {
    // draft is furthest from complete — project stays in pre-production
    expect(computeProjectStatus(tracks('recording', 'draft'), noSplits)).toBe('in_pre_production')
  })

  it('returns in_production when all tracks are at least recording', () => {
    expect(computeProjectStatus(tracks('recording', 'recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production when any track is recorded', () => {
    expect(computeProjectStatus(tracks('recorded', 'recorded'), noSplits)).toBe('in_production')
  })

  it('reflects the least-advanced track: recording + mastered → in_production', () => {
    expect(computeProjectStatus(tracks('recording', 'mastered'), noSplits)).toBe('in_production')
  })

  it('reflects the least-advanced track: draft + mastered → in_pre_production', () => {
    expect(computeProjectStatus(tracks('draft', 'mastered'), noSplits)).toBe('in_pre_production')
  })

  it('returns in_post_production when least advanced track is mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mastered'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when least advanced track is mixed', () => {
    expect(computeProjectStatus(tracks('mixed', 'released'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when all mastered but splits unsigned', () => {
    expect(computeProjectStatus(tracks('mastered', 'mastered'), unsignedSplits)).toBe('in_post_production')
  })

  it('returns ready_for_release when all mastered and no splits exist', () => {
    expect(computeProjectStatus(tracks('mastered', 'mastered'), noSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when all mastered and all splits signed', () => {
    expect(computeProjectStatus(tracks('mastered', 'mastered'), signedSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when mix of mastered/released and splits signed', () => {
    expect(computeProjectStatus(tracks('mastered', 'released'), signedSplits)).toBe('ready_for_release')
  })

  it('returns released when all tracks are released', () => {
    expect(computeProjectStatus(tracks('released', 'released'), signedSplits)).toBe('released')
  })

  it('returns released when single track is released', () => {
    expect(computeProjectStatus(tracks('released'), noSplits)).toBe('released')
  })
})
