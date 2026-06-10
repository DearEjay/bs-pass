export type TrackStatus =
  | 'not_started'
  | 'writing'
  | 'recording'
  | 'mixing'
  | 'mastering'
  | 'released'

export type ProjectStatus =
  | 'in_pre_production'
  | 'in_production'
  | 'in_post_production'
  | 'ready_for_release'
  | 'released'

const STAGE: Record<string, number> = {
  not_started: 0,
  writing:     1,
  recording:   2,
  mixing:      3,
  mastering:   4,
  released:    5,
}

export function computeProjectStatus(
  tracks: Array<{ current_status: string }>,
  splits: Array<{ signed_at: string | null }>,
): ProjectStatus {
  if (tracks.length === 0) return 'in_pre_production'

  const stages = tracks.map(t => STAGE[t.current_status] ?? 0)

  // All tracks released
  if (stages.every(s => s === 5)) return 'released'

  // All tracks at mastering or released — check splits
  if (stages.every(s => s >= 4)) {
    const allSplitsSigned = splits.length === 0 || splits.every(s => s.signed_at !== null)
    return allSplitsSigned ? 'ready_for_release' : 'in_post_production'
  }

  // Nothing started yet
  if (stages.every(s => s === 0)) return 'in_pre_production'

  // Mix of not_started and active work → project underway
  if (stages.some(s => s === 0)) return 'in_production'

  // All tracks in post-production (mixing or beyond)
  if (stages.every(s => s >= 3)) return 'in_post_production'

  return 'in_production'
}
