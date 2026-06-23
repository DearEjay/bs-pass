import { Redis } from 'https://esm.sh/@upstash/redis'
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit'

// Sliding-window rate limiter keyed by userId.
// Limits: LLM-heavy endpoints (agent-chat, budget-generate, agent-generate-roadmap)
export function makeLlmRatelimiter() {
  const redis = new Redis({
    url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
    token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
  })
  // 20 requests per user per minute for LLM calls
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1m'),
    prefix: 'bspass:llm',
  })
}
