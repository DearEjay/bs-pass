/**
 * BS-PASS Load Test — 100 concurrent users
 *
 * Prerequisites:
 *   brew install k6
 *
 * Usage:
 *   export SUPABASE_URL=https://your-project.supabase.co
 *   export SUPABASE_ANON_KEY=your_anon_key
 *   export TEST_EMAIL=test@bspass.dev
 *   export TEST_PASSWORD=TestPass123!
 *   k6 run load-tests/k6-100-users.js
 *
 * Targets:
 *   p95 response time < 1 000 ms for all API calls
 *   error rate < 1%
 *   100 concurrent VUs sustained for 60 seconds
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate     = new Rate('bs_error_rate')
const projectsTime  = new Trend('bs_projects_duration',  true)
const tasksTime     = new Trend('bs_tasks_duration',     true)
const tracksTime    = new Trend('bs_tracks_duration',    true)
const chatTime      = new Trend('bs_chat_duration',      true)

// ── Config ────────────────────────────────────────────────────────────────────
// All env vars are required — no hardcoded fallbacks for credentials
if (!__ENV.SUPABASE_URL || !__ENV.SUPABASE_ANON_KEY || !__ENV.TEST_EMAIL || !__ENV.TEST_PASSWORD) {
  throw new Error('Required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD')
}
const BASE_URL  = __ENV.SUPABASE_URL
const ANON_KEY  = __ENV.SUPABASE_ANON_KEY
const EMAIL     = __ENV.TEST_EMAIL
const PASSWORD  = __ENV.TEST_PASSWORD

export const options = {
  stages: [
    { duration: '15s', target: 25  },   // ramp up to 25 VUs
    { duration: '15s', target: 100 },   // ramp up to 100 VUs
    { duration: '60s', target: 100 },   // sustain 100 VUs
    { duration: '10s', target: 0   },   // ramp down
  ],
  thresholds: {
    http_req_duration:       ['p(95)<1000'],   // 95th percentile under 1s
    http_req_failed:         ['rate<0.01'],    // error rate under 1%
    bs_error_rate:           ['rate<0.01'],
    bs_projects_duration:    ['p(95)<800'],
    bs_tasks_duration:       ['p(95)<800'],
    bs_tracks_duration:      ['p(95)<800'],
    bs_chat_duration:        ['p(95)<600'],
  },
}

// ── Auth helper — called once per VU ─────────────────────────────────────────
function signIn() {
  const res = http.post(
    `${BASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
    },
  )
  check(res, { 'signed in': r => r.status === 200 })
  const body = JSON.parse(res.body)
  return body.access_token
}

// ── Main scenario ─────────────────────────────────────────────────────────────
export default function () {
  const token = signIn()
  if (!token) {
    errorRate.add(1)
    sleep(1)
    return
  }

  const authHeaders = {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  }

  // 1. List projects
  let r = http.get(`${BASE_URL}/rest/v1/projects?deleted_at=is.null&order=created_at.desc`, { headers: authHeaders })
  projectsTime.add(r.timings.duration)
  const ok1 = check(r, { 'projects 200': res => res.status === 200 })
  errorRate.add(!ok1)

  const projects = JSON.parse(r.body)
  if (!projects || projects.length === 0) { sleep(1); return }

  const projectId = projects[0].id
  sleep(0.5)

  // 2. List tasks for first project
  r = http.get(
    `${BASE_URL}/rest/v1/tasks?project_id=eq.${projectId}&deleted_at=is.null&order=sort_order.asc`,
    { headers: authHeaders },
  )
  tasksTime.add(r.timings.duration)
  const ok2 = check(r, { 'tasks 200': res => res.status === 200 })
  errorRate.add(!ok2)
  sleep(0.5)

  // 3. List tracks
  r = http.get(
    `${BASE_URL}/rest/v1/tracks?project_id=eq.${projectId}&deleted_at=is.null`,
    { headers: authHeaders },
  )
  tracksTime.add(r.timings.duration)
  const ok3 = check(r, { 'tracks 200': res => res.status === 200 })
  errorRate.add(!ok3)
  sleep(0.5)

  // 4. List chat messages (last 50)
  r = http.get(
    `${BASE_URL}/rest/v1/chat_messages?project_id=eq.${projectId}&order=created_at.desc&limit=50`,
    { headers: authHeaders },
  )
  chatTime.add(r.timings.duration)
  const ok4 = check(r, { 'chat 200': res => res.status === 200 })
  errorRate.add(!ok4)
  sleep(0.5)

  // 5. List collaborators
  r = http.get(
    `${BASE_URL}/rest/v1/collaborators?project_id=eq.${projectId}&removed_at=is.null`,
    { headers: authHeaders },
  )
  const ok5 = check(r, { 'collabs 200': res => res.status === 200 })
  errorRate.add(!ok5)
  sleep(1)
}
