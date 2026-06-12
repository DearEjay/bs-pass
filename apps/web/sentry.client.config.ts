import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance: sample 100% in dev, 20% in prod (adjust after baseline)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session replay: capture all replays where an error occurred, 10% otherwise
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Tag every event with the app version for release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',

  // Ignore noisy browser errors that aren't actionable
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    /^Loading chunk \d+ failed/,
    /^Failed to fetch dynamically imported module/,
  ],

  beforeSend(event) {
    // Strip auth tokens from breadcrumbs
    const breadcrumbValues = event.breadcrumbs?.values
    if (breadcrumbValues && typeof breadcrumbValues === 'object' && Symbol.iterator in breadcrumbValues) {
      const sanitised = Array.from(breadcrumbValues as Iterable<Record<string, unknown>>).map(b => {
        const data = b.data as Record<string, unknown> | undefined
        if (data?.url && typeof data.url === 'string') {
          data.url = data.url.replace(/access_token=[^&]+/, 'access_token=REDACTED')
        }
        return b
      })
      ;(event.breadcrumbs as unknown as Record<string, unknown>).values = sanitised
    }
    return event
  },
})
