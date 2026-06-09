# BS-PASS Web Frontend

Next.js 14 + React + TypeScript frontend for BS-PASS.

## Setup

```bash
cd apps/web
pnpm install
cp .env.local.example .env.local
pnpm dev
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and populate:
- Supabase URL and ANON_KEY
- Gemini API key
- PostHog key (analytics)
- Sentry DSN (error tracking)

## Directories

- `app/` — Next.js App Router pages
- `components/` — React components by feature (projects, tracks, chat, etc.)
- `hooks/` — TanStack Query hooks
- `lib/` — Utilities (Supabase client, validation, helpers)
- `stores/` — Zustand state (offline queue, UI state)
- `types/` — TypeScript interfaces

## Development

```bash
pnpm dev           # Start dev server (http://localhost:3000)
pnpm type-check    # TypeScript check
pnpm lint          # ESLint
pnpm build         # Production build
```
