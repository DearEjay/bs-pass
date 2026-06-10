export type TrackStatus =
  | 'draft'
  | 'recording'
  | 'recorded'
  | 'mixing'
  | 'mixed'
  | 'mastering'
  | 'mastered'
  | 'released'

export type ProjectStatus =
  | 'in_pre_production'
  | 'in_production'
  | 'in_post_production'
  | 'ready_for_release'
  | 'released'

const STAGE: Record<string, number> = {
  draft: 0,
  recording: 1,
  recorded: 2,
  mixing: 3,
  mixed: 4,
  mastering: 5,
  mastered: 6,
  released: 7,
}

export function computeProjectStatus(
  tracks: Array<{ current_status: string }>,
  splits: Array<{ signed_at: string | null }>,
): ProjectStatus {
  if (tracks.length === 0) return 'in_pre_production'

  const stages = tracks.map(t => STAGE[t.current_status] ?? 0)

  // All tracks released
  if (stages.every(s => s === 7)) return 'released'

  // All tracks mastered or released — check splits
  if (stages.every(s => s >= 6)) {
    const allSplitsSigned = splits.length === 0 || splits.every(s => s.signed_at !== null)
    return allSplitsSigned ? 'ready_for_release' : 'in_post_production'
  }

  // All tracks still in draft — nothing has started
  if (stages.every(s => s === 0)) return 'in_pre_production'

  // Mix of draft and started tracks → project is actively in production
  const hasDraft = stages.some(s => s === 0)
  if (hasDraft) return 'in_production'

  // All tracks started — are they all in post-production stages (mixing+)?
  if (stages.every(s => s >= 3)) return 'in_post_production'

  return 'in_production'
}
