import { posthog } from './posthog'

// ── Identity ──────────────────────────────────────────────────────────────────

export function identifyUser(userId: string, props?: { email?: string; name?: string }) {
  posthog.identify(userId, props)
}

export function resetUser() {
  posthog.reset()
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const track = {

  // Auth
  signupStarted:          ()                                     => posthog.capture('signup_started'),
  signupCompleted:        (props: { tos_version: string })       => posthog.capture('signup_completed', props),
  signupFailed:           (props: { reason: string })            => posthog.capture('signup_failed', props),
  loginCompleted:         ()                                     => posthog.capture('login_completed'),
  logoutCompleted:        ()                                     => posthog.capture('logout_completed'),

  // Projects
  projectCreated:         (props: { type: string; genre?: string })                    => posthog.capture('project_created', props),
  projectOpened:          (props: { project_id: string; type: string })                => posthog.capture('project_opened', props),
  projectSettingsOpened:  (props: { project_id: string })                              => posthog.capture('project_settings_opened', props),
  projectDeleted:         (props: { project_id: string })                              => posthog.capture('project_deleted', props),
  projectCoverUploaded:   (props: { project_id: string })                              => posthog.capture('project_cover_uploaded', props),
  projectFiltered:        (props: { filter: string; value: string })                   => posthog.capture('project_filtered', props),
  projectViewChanged:     (props: { view: 'grid' | 'list' })                           => posthog.capture('project_view_changed', props),

  // Tracks
  trackCreated:           (props: { project_id: string })                              => posthog.capture('track_created', props),
  trackStatusChanged:     (props: { project_id: string; from: string; to: string })    => posthog.capture('track_status_changed', props),
  trackDeleted:           (props: { project_id: string })                              => posthog.capture('track_deleted', props),
  stemUploaded:           (props: { project_id: string; track_id: string })            => posthog.capture('stem_uploaded', props),
  stemDownloaded:         (props: { project_id: string; track_id: string })            => posthog.capture('stem_downloaded', props),
  creditsAdded:           (props: { project_id: string; track_id: string })            => posthog.capture('credits_added', props),

  // Roadmap
  roadmapViewed:          (props: { project_id: string; task_count: number })          => posthog.capture('roadmap_viewed', props),
  roadmapGenerated:       (props: { project_id: string; task_count: number })          => posthog.capture('roadmap_generated', props),
  roadmapRegenerated:     (props: { project_id: string })                              => posthog.capture('roadmap_regenerated', props),
  taskCreated:            (props: { project_id: string; source: 'manual' | 'agent' })  => posthog.capture('task_created', props),
  taskCompleted:          (props: { project_id: string; priority: string })            => posthog.capture('task_completed', props),
  taskDeleted:            (props: { project_id: string })                              => posthog.capture('task_deleted', props),
  taskBulkDeleted:        (props: { project_id: string; count: number })               => posthog.capture('task_bulk_deleted', props),
  taskAutoAssigned:       (props: { project_id: string; count: number })               => posthog.capture('task_auto_assigned', props),
  roadmapViewChanged:     (props: { view: 'list' | 'gantt' })                          => posthog.capture('roadmap_view_changed', props),
  roadmapFiltered:        (props: { filter: string })                                  => posthog.capture('roadmap_filtered', props),
  summarySeen:            (props: { project_id: string })                              => posthog.capture('roadmap_summary_seen', props),
  summaryRegenerated:     (props: { project_id: string })                              => posthog.capture('roadmap_summary_regenerated', props),

  // Collaborators
  collaboratorInvited:    (props: { project_id: string; role: string })                => posthog.capture('collaborator_invited', props),
  collaboratorRemoved:    (props: { project_id: string })                              => posthog.capture('collaborator_removed', props),
  inviteAccepted:         (props: { project_id: string })                              => posthog.capture('invite_accepted', props),

  // Splits
  splitsViewed:           (props: { project_id: string; track_id: string })            => posthog.capture('splits_viewed', props),
  splitUpdated:           (props: { project_id: string; track_id: string })            => posthog.capture('split_updated', props),
  splitSignatureRequested:(props: { project_id: string; track_id: string; parties: number }) => posthog.capture('split_signature_requested', props),
  splitSigned:            (props: { project_id: string; track_id: string })            => posthog.capture('split_signed', props),
  splitPdfDownloaded:     (props: { project_id: string; track_id: string })            => posthog.capture('split_pdf_downloaded', props),
  splitsAutoPopulated:    (props: { project_id: string; track_id: string; count: number }) => posthog.capture('splits_auto_populated', props),

  // Chat
  messageSent:            (props: { project_id: string; has_mention: boolean })        => posthog.capture('chat_message_sent', props),
  reactionAdded:          (props: { project_id: string })                              => posthog.capture('chat_reaction_added', props),
  atHereUsed:             (props: { project_id: string })                              => posthog.capture('chat_at_here_used', props),

  // Notifications
  notificationOpened:     (props: { type: string })                                    => posthog.capture('notification_opened', props),
  notificationsAllRead:   ()                                                           => posthog.capture('notifications_all_read'),

  // Profile
  profileUpdated:         (props: { fields: string[] })                                => posthog.capture('profile_updated', props),
  agentPrefsUpdated:      (props: { tone?: string; verbosity?: string })               => posthog.capture('agent_prefs_updated', props),
  agentPluginToggled:     (props: { plugin: string; enabled: boolean })                => posthog.capture('agent_plugin_toggled', props),
  agentLearningReset:     ()                                                           => posthog.capture('agent_learning_reset'),
  publishingInfoSaved:    ()                                                           => posthog.capture('publishing_info_saved'),

  // Onboarding
  onboardingStarted:      ()                                                           => posthog.capture('onboarding_started'),
  onboardingStepViewed:   (props: { step: number; title: string })                     => posthog.capture('onboarding_step_viewed', props),
  onboardingCompleted:    ()                                                           => posthog.capture('onboarding_completed'),
  onboardingSkipped:      (props: { at_step: number })                                 => posthog.capture('onboarding_skipped', props),

  // Offline / sync
  offlineQueueFlushed:    (props: { count: number })                                   => posthog.capture('offline_queue_flushed', props),
}
