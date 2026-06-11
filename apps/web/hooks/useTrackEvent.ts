import { posthog } from '@/lib/posthog'

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  try {
    posthog.capture(event, properties)
  } catch {
    // PostHog not initialized (SSR or missing key) — no-op
  }
}
