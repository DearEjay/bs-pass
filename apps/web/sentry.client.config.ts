// Sentry is activated once NEXT_PUBLIC_SENTRY_DSN is set in .env.local.
// Full server/edge support requires upgrading to @sentry/nextjs@8 + adding
// withSentryConfig() in next.config.js. For now, client-side only.
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}
