# Supabase Backend

PostgreSQL database + Deno Edge Functions for BS-PASS.

## Setup

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your Supabase project (optional for MVP dev)
supabase link --project-ref <your-project-ref>

# Start local dev environment
supabase start

# Stop local environment
supabase stop
```

## Migrations

All schema changes live in `migrations/` folder. Files are auto-numbered (e.g., `20260607_init.sql`).

Apply migrations:
```bash
supabase db push
```

## Edge Functions

TypeScript functions in `functions/` folder.

- `agent-generate-roadmap/` — Generate roadmap from template + Gemini
- `agent-process-event/` — React to domain events (track status, task complete, etc.)
- `splits-request-signatures/` — Generate signature tokens + send emails
- `splits-sign/` — Validate token and record signature
- `splits-generate-pdf/` — Generate PDF on-demand
- `notifications-send-email/` — Transactional email dispatch
- `_shared/` — Shared utilities (auth, db, Gemini, SendGrid)

Deploy:
```bash
supabase functions deploy <function-name>
```

Serve locally:
```bash
supabase functions serve
```

## Seeding

Dev data (roadmap templates, role definitions) in `seed.sql`.

Apply:
```bash
supabase db push --seed
```

## Environment Variables

Edge Function secrets (in Supabase dashboard or `.env.supabase`):
- `GEMINI_API_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `APP_BASE_URL` (for signature links)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
