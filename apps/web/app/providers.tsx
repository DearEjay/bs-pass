'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { initPostHog } from '@/lib/posthog'
import { identifyUser } from '@/lib/analytics'
import { setSentryUser, clearSentryUser } from '@/lib/sentry'
import { createClient } from '@/lib/supabase/client'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  )

  useEffect(() => {
    initPostHog()

    const supabase = createClient()
    function handleSession(session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) {
      if (session?.user) {
        const name = (session.user.user_metadata?.full_name as string | undefined) ?? session.user.email?.split('@')[0]
        identifyUser(session.user.id, { email: session.user.email, name })
        setSentryUser(session.user.id, session.user.email, name)
      } else {
        clearSentryUser()
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
