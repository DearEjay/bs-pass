export type TrackStatus =
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
  writing:   0,
  recording: 1,
  mixing:    2,
  mastering: 3,
  released:  4,
}

export function computeProjectStatus(
  tracks: Array<{ current_status: string }>,
  splits: Array<{ signed_at: string | null }>,
): ProjectStatus {
  if (tracks.length === 0) return 'in_pre_production'

  const stages = tracks.map(t => STAGE[t.current_status] ?? 0)

  // All tracks released
  if (stages.every(s => s === 4)) return 'released'

  // All tracks at mastering or released — check splits
  if (stages.every(s => s >= 3)) {
    const allSplitsSigned = splits.length === 0 || splits.every(s => s.signed_at !== null)
    return allSplitsSigned ? 'ready_for_release' : 'in_post_production'
  }

  // All tracks still in writing — nothing active yet
  if (stages.every(s => s === 0)) return 'in_pre_production'

  // Mix of writing and active work → project underway
  if (stages.some(s => s === 0)) return 'in_production'

  // All tracks in post-production (mixing or beyond)
  if (stages.every(s => s >= 2)) return 'in_post_production'

  return 'in_production'
}
