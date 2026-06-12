import { describe, it, expect } from 'vitest'
import { computeProjectStatus } from '@shared/project-status'

const noSplits: Array<{ signed_at: string | null }> = []
const allSigned = [{ signed_at: '2026-06-08T00:00:00Z' }, { signed_at: '2026-06-08T00:00:00Z' }]
const partialSigned = [{ signed_at: '2026-06-08T00:00:00Z' }, { signed_at: null }]
const allUnsigned = [{ signed_at: null }, { signed_at: null }]
const oneSplit = [{ signed_at: '2026-06-08T00:00:00Z' }]

function tracks(...statuses: string[]) {
  return statuses.map(s => ({ current_status: s }))
}

// ── Pre-production ───────────────────────────────────────────────────────────

describe('computeProjectStatus — pre-production', () => {
  it('returns in_pre_production with no tracks', () => {
    expect(computeProjectStatus([], noSplits)).toBe('in_pre_production')
  })

  it('returns in_pre_production with no tracks even when splits exist', () => {
    expect(computeProjectStatus([], allSigned)).toBe('in_pre_production')
  })

  it('returns in_pre_production when all tracks are writing', () => {
    expect(computeProjectStatus(tracks('writing', 'writing'), noSplits)).toBe('in_pre_production')
  })

  it('returns in_pre_production for a single writing track', () => {
    expect(computeProjectStatus(tracks('writing'), noSplits)).toBe('in_pre_production')
  })

  it('returns in_pre_production when all tracks are writing with signed splits', () => {
    expect(computeProjectStatus(tracks('writing'), allSigned)).toBe('in_pre_production')
  })
})

// ── In production ────────────────────────────────────────────────────────────

describe('computeProjectStatus — in-production', () => {
  it('returns in_production when all tracks are recording', () => {
    expect(computeProjectStatus(tracks('recording', 'recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production for a single recording track', () => {
    expect(computeProjectStatus(tracks('recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production for mix of released and writing', () => {
    expect(computeProjectStatus(tracks('released', 'writing'), noSplits)).toBe('in_production')
  })

  it('returns in_production for mix of recording and writing', () => {
    expect(computeProjectStatus(tracks('recording', 'writing'), noSplits)).toBe('in_production')
  })

  it('returns in_production for mix of mastering and writing', () => {
    expect(computeProjectStatus(tracks('mastering', 'writing'), noSplits)).toBe('in_production')
  })

  it('returns in_production for mix of mixing and recording', () => {
    expect(computeProjectStatus(tracks('mixing', 'recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production for mix of mastering and recording', () => {
    expect(computeProjectStatus(tracks('mastering', 'recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production for mix of released and recording', () => {
    expect(computeProjectStatus(tracks('released', 'recording'), noSplits)).toBe('in_production')
  })

  it('returns in_production for 3 tracks: mixing, recording, writing', () => {
    expect(computeProjectStatus(tracks('mixing', 'recording', 'writing'), noSplits)).toBe('in_production')
  })
})

// ── Post-production ──────────────────────────────────────────────────────────

describe('computeProjectStatus — post-production', () => {
  it('returns in_post_production when all tracks are mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mixing'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production for a single mixing track', () => {
    expect(computeProjectStatus(tracks('mixing'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when least advanced is mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mastering'), noSplits)).toBe('in_post_production')
  })

  it('returns in_post_production when all mastering but splits are partially unsigned', () => {
    expect(computeProjectStatus(tracks('mastering', 'mastering'), partialSigned)).toBe('in_post_production')
  })

  it('returns in_post_production when all mastering but all splits are unsigned', () => {
    expect(computeProjectStatus(tracks('mastering'), allUnsigned)).toBe('in_post_production')
  })

  it('returns in_post_production for mix of mastering/released with unsigned splits', () => {
    expect(computeProjectStatus(tracks('mastering', 'released'), partialSigned)).toBe('in_post_production')
  })

  it('returns in_post_production for 3 tracks all at mixing', () => {
    expect(computeProjectStatus(tracks('mixing', 'mixing', 'mixing'), noSplits)).toBe('in_post_production')
  })
})

// ── Ready for release ────────────────────────────────────────────────────────

describe('computeProjectStatus — ready_for_release', () => {
  it('returns ready_for_release when all mastering and no splits exist', () => {
    expect(computeProjectStatus(tracks('mastering', 'mastering'), noSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when single mastering track and no splits', () => {
    expect(computeProjectStatus(tracks('mastering'), noSplits)).toBe('ready_for_release')
  })

  it('returns ready_for_release when all mastering and all splits signed', () => {
    expect(computeProjectStatus(tracks('mastering', 'mastering'), allSigned)).toBe('ready_for_release')
  })

  it('returns ready_for_release when mix of mastering/released and all splits signed', () => {
    expect(computeProjectStatus(tracks('mastering', 'released'), allSigned)).toBe('ready_for_release')
  })

  it('returns ready_for_release when mastering with single signed split', () => {
    expect(computeProjectStatus(tracks('mastering'), oneSplit)).toBe('ready_for_release')
  })

  it('returns ready_for_release when all mastering with 3 signed splits', () => {
    const threeSigned = [
      { signed_at: '2026-06-08T00:00:00Z' },
      { signed_at: '2026-06-09T00:00:00Z' },
      { signed_at: '2026-06-10T00:00:00Z' },
    ]
    expect(computeProjectStatus(tracks('mastering'), threeSigned)).toBe('ready_for_release')
  })
})

// ── Released ─────────────────────────────────────────────────────────────────

describe('computeProjectStatus — released', () => {
  it('returns released when all tracks are released', () => {
    expect(computeProjectStatus(tracks('released', 'released'), allSigned)).toBe('released')
  })

  it('returns released when single track is released', () => {
    expect(computeProjectStatus(tracks('released'), noSplits)).toBe('released')
  })

  it('returns released when single released track with unsigned splits (splits irrelevant once released)', () => {
    expect(computeProjectStatus(tracks('released'), allUnsigned)).toBe('released')
  })

  it('returns released for 3 released tracks no splits', () => {
    expect(computeProjectStatus(tracks('released', 'released', 'released'), noSplits)).toBe('released')
  })
})

// ── Unknown / fallback status ─────────────────────────────────────────────────

describe('computeProjectStatus — unknown track status fallback', () => {
  it('treats unknown status as writing (stage 0)', () => {
    // Unknown status → stage 0 (writing) via `?? 0` fallback
    expect(computeProjectStatus(tracks('on_hold'), noSplits)).toBe('in_pre_production')
  })

  it('mix of unknown and released → in_production (unknown treated as writing)', () => {
    expect(computeProjectStatus(tracks('released', 'on_hold'), noSplits)).toBe('in_production')
  })

  it('mix of unknown statuses all treated as writing → in_pre_production', () => {
    expect(computeProjectStatus(tracks('on_hold', 'paused'), noSplits)).toBe('in_pre_production')
  })
})

// ── Splits state edge cases ──────────────────────────────────────────────────

describe('computeProjectStatus — splits edge cases', () => {
  it('empty splits array is treated as "all signed" (no signatories needed)', () => {
    expect(computeProjectStatus(tracks('mastering'), noSplits)).toBe('ready_for_release')
  })

  it('single unsigned split blocks ready_for_release', () => {
    expect(computeProjectStatus(tracks('mastering'), [{ signed_at: null }])).toBe('in_post_production')
  })

  it('splits state is irrelevant when project is still in production', () => {
    expect(computeProjectStatus(tracks('recording'), allSigned)).toBe('in_production')
    expect(computeProjectStatus(tracks('recording'), partialSigned)).toBe('in_production')
  })

  it('splits state is irrelevant when all tracks already released', () => {
    expect(computeProjectStatus(tracks('released'), partialSigned)).toBe('released')
    expect(computeProjectStatus(tracks('released'), allUnsigned)).toBe('released')
  })
})

// ── Large project scenarios ──────────────────────────────────────────────────

describe('computeProjectStatus — multi-track album scenarios', () => {
  it('10-track album all writing → pre_production', () => {
    const ten = Array(10).fill({ current_status: 'writing' })
    expect(computeProjectStatus(ten, noSplits)).toBe('in_pre_production')
  })

  it('10-track album all released → released', () => {
    const ten = Array(10).fill({ current_status: 'released' })
    expect(computeProjectStatus(ten, noSplits)).toBe('released')
  })

  it('9 tracks released, 1 recording → in_production', () => {
    const mixed = [
      ...Array(9).fill({ current_status: 'released' }),
      { current_status: 'recording' },
    ]
    expect(computeProjectStatus(mixed, noSplits)).toBe('in_production')
  })

  it('all tracks at mastering, mixed signed/unsigned → in_post_production', () => {
    const tenMastering = Array(10).fill({ current_status: 'mastering' })
    const mixedSplits = [{ signed_at: '2026-01-01T00:00:00Z' }, { signed_at: null }]
    expect(computeProjectStatus(tenMastering, mixedSplits)).toBe('in_post_production')
  })
})
