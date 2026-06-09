# Supabase Backend

PostgreSQL database + Deno Edge Functions for BS-PASS.

This project uses a **remote Supabase project** — no local stack required.

## Setup

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Authenticate with Supabase
supabase login

# Link to the remote project (already done — supabase/.temp/linked-project.json tracks this)
supabase link --project-ref qbfmotconogcybnmoqbd
```

## Migrations

Schema changes live in `migrations/`. Files are auto-numbered (e.g., `20260607_init.sql`).

Apply to remote:
```bash
pnpm supabase:push   # runs: supabase db push
```

Dry-run (safe to run anytime, used in CI):
```bash
supabase db push --dry-run
```

## Edge Functions

TypeScript functions in `functions/`, Deno runtime.

- `agent-generate-roadmap/` — Generate roadmap from template + Gemini
- `agent-process-event/` — React to domain events (track status, task complete, etc.)
- `splits-request-signatures/` — Generate signature tokens + send emails
- `splits-sign/` — Validate token and record signature
- `splits-generate-pdf/` — Generate PDF on-demand
- `notifications-send-email/` — Transactional email dispatch
- `_shared/` — Shared utilities (auth, db, Gemini, Resend)

Deploy all functions to remote:
```bash
pnpm supabase:functions:deploy   # runs: supabase functions deploy
```

Deploy a single function:
```bash
supabase functions deploy <function-name>
```

## Seeding

Initial data (roadmap templates, collaborator role definitions) in `seed.sql`.

```bash
supabase db push --include-seed
```

## Environment Variables

Edge Function secrets are set in the **Supabase dashboard** (Project Settings → Edge Functions), not locally:

- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_BASE_URL` (base URL for signature links, e.g. `https://app.bspass.com`)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
