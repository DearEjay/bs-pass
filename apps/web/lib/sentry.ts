import * as Sentry from '@sentry/nextjs'

export function setSentryUser(userId: string, email?: string, name?: string) {
  Sentry.setUser({ id: userId, email, username: name })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}

export type Feature =
  | 'auth'
  | 'projects'
  | 'tracks'
  | 'roadmap'
  | 'splits'
  | 'chat'
  | 'notifications'
  | 'collaborators'
  | 'profile'
  | 'agent'
  | 'onboarding'

export function captureFeatureError(
  err: unknown,
  feature: Feature,
  context?: Record<string, unknown>,
) {
  Sentry.withScope(scope => {
    scope.setTag('feature', feature)
    if (context) scope.setContext('extra', context)
    Sentry.captureException(err)
  })
}

export function addBreadcrumb(message: string, category: Feature, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' })
}
