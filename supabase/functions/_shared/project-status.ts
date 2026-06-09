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

// Ordered by completion — project status is driven by the least-advanced track
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

  const minStage = Math.min(...tracks.map(t => STAGE[t.current_status] ?? 0))

  if (minStage >= 7) return 'released'

  if (minStage >= 6) {
    const allSplitsSigned = splits.length === 0 || splits.every(s => s.signed_at !== null)
    return allSplitsSigned ? 'ready_for_release' : 'in_post_production'
  }

  if (minStage >= 3) return 'in_post_production'

  if (minStage >= 1) return 'in_production'

  return 'in_pre_production'
}
