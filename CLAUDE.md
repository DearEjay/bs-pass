# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

BS-PASS — AI-powered music project management for independent artists. Built as a monorepo with a Next.js 14 frontend (`apps/web/`) and Supabase as the entire backend (PostgreSQL, Auth, Storage, Realtime, Edge Functions). No separate API server exists.

Package manager: **pnpm** (required; `package-lock.json` exists as an artifact but pnpm is canonical).

## Commands

```bash
# Frontend
pnpm dev              # Next.js dev server at http://localhost:3000
pnpm build            # Production build
pnpm lint             # ESLint
pnpm type-check       # tsc --noEmit (TypeScript check without emitting)

# Supabase (local dev stack — must be running for the app to work)
pnpm supabase:start          # Start local DB, Auth, Storage, Edge Functions
pnpm supabase:stop           # Stop local Supabase stack
pnpm supabase:push           # Apply SQL migrations to local DB
pnpm supabase:functions:serve # Serve Edge Functions locally (Deno runtime)
pnpm supabase:functions:deploy # Deploy to Supabase cloud
```

## Architecture

### One platform, no second server

Everything backend lives in a single Supabase project. The Next.js frontend calls Supabase directly for standard CRUD (via the Supabase JS client + PostgREST) and calls **Supabase Edge Functions** for anything requiring server-side logic. There is no FastAPI, Railway, or any other server.

```
Browser → Supabase JS client → PostgreSQL + RLS (standard CRUD)
Browser → fetch() → Supabase Edge Functions (agent, PDF, email, signatures)
```

### Edge Functions (`supabase/functions/`)

All written in TypeScript on the Deno runtime. Each function is a focused module. Shared utilities live in `_shared/`:

- `agent-generate-roadmap` — project creation / manual regenerate: loads project context + user preferences → builds Gemini prompt from a seeded roadmap template → inserts tasks → posts to chat
- `agent-process-event` — called asynchronously after domain events (`track.status_changed`, `task.completed`, `collaborator.added`, `collaborator.removed`); agent creates follow-up tasks, reassigns, posts to chat
- `splits-request-signatures` — generates UUID tokens per split, stores them, sends emails via Resend
- `splits-sign` — validates token ownership, records `signed_at`/`signed_ip`, nullifies token (single-use)
- `splits-generate-pdf` — generates PDF bytes on-demand and streams the download; **not stored**
- `notifications-send-email` — transactional emails (invite, task digest) via Resend
- `_shared/auth.ts` — JWT verification middleware
- `_shared/db.ts` — Supabase service role client (bypasses RLS for agent writes)
- `_shared/gemini.ts` — Gemini REST API wrapper (Gemini 1.5 Flash)
- `_shared/resend.ts` — Resend email wrapper (`sendEmail()`)
- `_shared/project-status.ts` — `computeProjectStatus()` pure function

The LLM is **Gemini** (not Claude/OpenAI). The agent never invents a roadmap from scratch — it customizes seeded templates from the `roadmap_templates` DB table. Agent guardrails: max 5 tasks per trigger, 30-second debounce per project, no destructive actions, all writes go to `audit_logs`.

### Frontend (`apps/web/`)

Next.js 14 App Router. TypeScript strict mode. Path alias `@/*` maps to `apps/web/*`.

**Route groups:**
- `(auth)/` — login, signup
- `(app)/` — auth-guarded shell; project list and per-project tabs (tracks, roadmap, stems, chat, collaborators, splits)
- `api/auth/callback/` — Supabase OAuth callback
- `api/splits/sign/[token]/` — public signature page (the only unauthenticated route)

**State management:**
- TanStack Query v5 — all server data, caching, optimistic updates
- Zustand — offline queue (backed by IndexedDB via `idb`) and UI-only state
- Supabase Realtime — chat messages, notifications, task updates (Postgres Change subscriptions)

**File upload pattern:** Request a signed URL from Supabase Storage → browser uploads directly to Storage → frontend inserts the DB record to confirm. Never proxy files through the Next.js server.

### Database

PostgreSQL with RLS on every table. Key conventions:
- All tables have `created_at`, `updated_at` (auto-managed via trigger), and `deleted_at` for soft deletes
- Filter soft-deleted rows with `.is('deleted_at', null)`
- Splits 100% sum validation lives in the Edge Function layer, not in DB constraints
- `audit_logs` is append-only: no UPDATE or DELETE via RLS; inserts only via service role
- Collaborator access enforced by RLS using `auth.uid()` and `is_main_artist` flag

Core tables: `profiles`, `projects`, `collaborators`, `tracks`, `track_versions`, `stems`, `stem_versions`, `tasks`, `task_dependencies`, `splits`, `chat_messages`, `notifications`, `audit_logs`, `user_agent_preferences`, `roadmap_templates`, `collaborator_role_definitions`

Migrations live in `supabase/migrations/`. Apply with `pnpm supabase:push`.

### Auth model

Supabase JWT — stateless everywhere. The Supabase JS client attaches the JWT to all requests automatically. Edge Functions receive it in `Authorization` header and the Supabase runtime verifies it. Two authorization levels enforced at both RLS and Edge Function layers:
- **Any active collaborator** — read all project data, create tasks, post chat
- **Main artist only** (`is_main_artist = true`) — update splits, invite/remove collaborators, update project settings, delete tracks/stems

## Environment variables

Copy `apps/web/.env.local.example` to `apps/web/.env.local`. Required:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GEMINI_API_KEY   # used client-side in the frontend
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_APP_URL
```

Edge Function secrets (set in Supabase dashboard, not `.env`): `GEMINI_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_BASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Key shared logic

`computeProjectStatus()` in `supabase/functions/_shared/project-status.ts` is the single source of truth for project status derivation from track statuses + split signatures. It is a pure function used by both Edge Functions and the frontend (for optimistic updates). Do not duplicate this logic.

## CI/CD

GitHub Actions runs `tsc --noEmit`, `deno check`, and `supabase db push --dry-run` on PRs. Merges to `main` auto-deploy to Vercel (frontend) and Supabase (Edge Functions + migrations).
