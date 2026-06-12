import { describe, it, expect } from 'vitest'
import { splitsAreValid, distributeEvenly, matchCreditsToCollaborators } from '@/lib/splits-utils'

// ── splitsAreValid ──────────────────────────────────────────────────────────

describe('splitsAreValid', () => {
  it('returns false for empty array', () => {
    expect(splitsAreValid([])).toBe(false)
  })

  it('returns true for a single 100% split', () => {
    expect(splitsAreValid([100])).toBe(true)
  })

  it('returns true for two 50% splits', () => {
    expect(splitsAreValid([50, 50])).toBe(true)
  })

  it('returns true for three decimal shares that sum to exactly 100', () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    expect(splitsAreValid([33.33, 33.33, 33.34])).toBe(true)
  })

  it('returns false for 99.99% — rejects at boundary, does not round up', () => {
    expect(splitsAreValid([33.33, 33.33, 33.33])).toBe(false)
  })

  it('returns false for 100.01% — rejects over-allocation', () => {
    expect(splitsAreValid([50, 50.01])).toBe(false)
  })

  it('returns false for 99.00% — rejects obvious under-allocation', () => {
    expect(splitsAreValid([50, 49])).toBe(false)
  })

  it('returns false for 0%', () => {
    expect(splitsAreValid([0])).toBe(false)
  })

  it('returns false for 200%', () => {
    expect(splitsAreValid([100, 100])).toBe(false)
  })

  it('handles values coerced from number-strings', () => {
    expect(splitsAreValid([Number('50.00'), Number('50.00')])).toBe(true)
  })

  it('returns false for 5 rows each at 20.01% (100.05%)', () => {
    expect(splitsAreValid([20.01, 20.01, 20.01, 20.01, 20.01])).toBe(false)
  })

  it('returns true for 4 rows at 25% each', () => {
    expect(splitsAreValid([25, 25, 25, 25])).toBe(true)
  })

  it('100% allocated across two rows (one being 0) is valid — DB allows zero-share rows', () => {
    expect(splitsAreValid([100, 0])).toBe(true)
  })
})

// ── distributeEvenly ────────────────────────────────────────────────────────

describe('distributeEvenly', () => {
  it('returns empty array for 0 rows', () => {
    expect(distributeEvenly(0)).toEqual([])
  })

  it('returns [100] for 1 row', () => {
    expect(distributeEvenly(1)).toEqual([100])
  })

  it('returns [50, 50] for 2 rows', () => {
    expect(distributeEvenly(2)).toEqual([50, 50])
  })

  it('returns [33.33, 33.33, 33.34] for 3 rows', () => {
    expect(distributeEvenly(3)).toEqual([33.33, 33.33, 33.34])
  })

  it('returns [25, 25, 25, 25] for 4 rows', () => {
    expect(distributeEvenly(4)).toEqual([25, 25, 25, 25])
  })

  it('result sums to exactly 100 for 7 rows', () => {
    const result = distributeEvenly(7)
    expect(splitsAreValid(result)).toBe(true)
    expect(result).toHaveLength(7)
  })

  it('result sums to exactly 100 for 10 rows', () => {
    const result = distributeEvenly(10)
    expect(splitsAreValid(result)).toBe(true)
    expect(result).toHaveLength(10)
  })

  it('all non-last rows have the same value', () => {
    const result = distributeEvenly(5)
    expect(result[0]).toBe(result[1])
    expect(result[1]).toBe(result[2])
    expect(result[2]).toBe(result[3])
  })

  it('last row covers rounding remainder', () => {
    const result = distributeEvenly(3)
    expect(result[2]).toBe(33.34)
  })

  it('passes splitsAreValid for all counts 1 through 20', () => {
    for (let n = 1; n <= 20; n++) {
      const result = distributeEvenly(n)
      expect(splitsAreValid(result), `n=${n}`).toBe(true)
    }
  })

  it('values are rounded to 2 decimal places', () => {
    for (let n = 1; n <= 20; n++) {
      const result = distributeEvenly(n)
      for (const v of result) {
        const rounded = parseFloat(v.toFixed(2))
        expect(v, `value ${v} at n=${n}`).toBe(rounded)
      }
    }
  })
})

// ── matchCreditsToCollaborators ─────────────────────────────────────────────

describe('matchCreditsToCollaborators', () => {
  const collabs = [
    { id: 'c1', display_name: 'Alice Johnson' },
    { id: 'c2', display_name: 'Bob Smith' },
    { id: 'c3', display_name: 'Charlie Brown' },
  ]

  it('returns empty array when credits is empty', () => {
    expect(matchCreditsToCollaborators([], collabs)).toEqual([])
  })

  it('returns empty array when collaborators is empty', () => {
    expect(matchCreditsToCollaborators([{ name: 'Alice Johnson' }], [])).toEqual([])
  })

  it('matches exactly by display_name', () => {
    expect(matchCreditsToCollaborators([{ name: 'Alice Johnson' }], collabs)).toEqual(['c1'])
  })

  it('matches case-insensitively', () => {
    expect(matchCreditsToCollaborators([{ name: 'alice johnson' }], collabs)).toEqual(['c1'])
    expect(matchCreditsToCollaborators([{ name: 'ALICE JOHNSON' }], collabs)).toEqual(['c1'])
    expect(matchCreditsToCollaborators([{ name: 'Alice JOHNSON' }], collabs)).toEqual(['c1'])
  })

  it('matches multiple credits in order', () => {
    const result = matchCreditsToCollaborators(
      [{ name: 'Alice Johnson' }, { name: 'Bob Smith' }],
      collabs,
    )
    expect(result).toEqual(['c1', 'c2'])
  })

  it('deduplicates: same collaborator matched by multiple credits appears once', () => {
    const result = matchCreditsToCollaborators(
      [{ name: 'Alice Johnson' }, { name: 'alice johnson' }],
      collabs,
    )
    expect(result).toEqual(['c1'])
  })

  it('skips credits with null name', () => {
    const result = matchCreditsToCollaborators(
      [{ name: null }, { name: 'Bob Smith' }],
      collabs,
    )
    expect(result).toEqual(['c2'])
  })

  it('skips credits with empty string name', () => {
    const result = matchCreditsToCollaborators(
      [{ name: '' }, { name: 'Bob Smith' }],
      collabs,
    )
    expect(result).toEqual(['c2'])
  })

  it('skips credits with whitespace-only name', () => {
    const result = matchCreditsToCollaborators(
      [{ name: '   ' }, { name: 'Bob Smith' }],
      collabs,
    )
    expect(result).toEqual(['c2'])
  })

  it('ignores unmatched credit names', () => {
    const result = matchCreditsToCollaborators(
      [{ name: 'Dave Unregistered' }, { name: 'Alice Johnson' }],
      collabs,
    )
    expect(result).toEqual(['c1'])
  })

  it('returns empty array when no credits match', () => {
    expect(matchCreditsToCollaborators([{ name: 'Nobody' }], collabs)).toEqual([])
  })

  it('trims whitespace from credit name before matching', () => {
    const result = matchCreditsToCollaborators([{ name: '  Alice Johnson  ' }], collabs)
    expect(result).toEqual(['c1'])
  })

  it('trims whitespace from collaborator display_name before matching', () => {
    const collabsWithSpace = [{ id: 'c1', display_name: '  Alice Johnson  ' }]
    const result = matchCreditsToCollaborators([{ name: 'Alice Johnson' }], collabsWithSpace)
    expect(result).toEqual(['c1'])
  })

  it('handles collaborators with null display_name without crashing', () => {
    const collabsWithNull = [{ id: 'c1', display_name: null }, { id: 'c2', display_name: 'Bob' }]
    const result = matchCreditsToCollaborators([{ name: 'Bob' }], collabsWithNull)
    expect(result).toEqual(['c2'])
  })

  it('returns all three collaborators when all credits match', () => {
    const result = matchCreditsToCollaborators(
      [{ name: 'Alice Johnson' }, { name: 'Bob Smith' }, { name: 'Charlie Brown' }],
      collabs,
    )
    expect(result).toEqual(['c1', 'c2', 'c3'])
  })
})
