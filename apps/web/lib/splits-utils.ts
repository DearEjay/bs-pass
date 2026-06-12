/** Returns true when the given percentages sum to exactly 100.00% (2-decimal precision). */
export function splitsAreValid(percentages: number[]): boolean {
  if (percentages.length === 0) return false
  const total = percentages.reduce((s, p) => s + Number(p), 0)
  return Math.round(total * 100) === 10000
}

/** Distributes 100% evenly across `count` rows. Last row absorbs rounding remainder. */
export function distributeEvenly(count: number): number[] {
  if (count === 0) return []
  const pct = parseFloat((100 / count).toFixed(2))
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? parseFloat((100 - pct * (count - 1)).toFixed(2)) : pct
  )
}

/**
 * Matches credit names to collaborators by display_name (case-insensitive, trims whitespace).
 * Returns collaborator IDs in match order, deduplicated.
 */
export function matchCreditsToCollaborators(
  credits: Array<{ name: string | null; role?: string | null }>,
  collaborators: Array<{ id: string; display_name: string | null }>
): string[] {
  const matched: string[] = []
  const matchedIds = new Set<string>()
  for (const credit of credits) {
    const name = credit.name?.trim().toLowerCase()
    if (!name) continue
    const collab = collaborators.find(c => c.display_name?.trim().toLowerCase() === name)
    if (collab && !matchedIds.has(collab.id)) {
      matchedIds.add(collab.id)
      matched.push(collab.id)
    }
  }
  return matched
}
