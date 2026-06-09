# BS-PASS

AI-powered music project management for independent artists.

**Stack:** Next.js 14 · Supabase · Vercel · TypeScript

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy env file and fill in your remote Supabase credentials
cp apps/web/.env.local.example apps/web/.env.local

# Run frontend dev server (points to remote Supabase)
pnpm dev

# Visit http://localhost:3000
```

> **Note:** This project uses a **remote Supabase project** for development. No local Supabase stack is required. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `apps/web/.env.local` to your project's API credentials.

## Documentation

- **Technical Plan:** [docs/technical/TECHPLAN.md](docs/technical/TECHPLAN.md)
- **Product Spec:** [docs/product/](docs/product/)
- **Design & Wireframes:** [docs/design/](docs/design/)

## Project Structure

```
apps/web/           → Next.js 14 frontend (Vercel)
supabase/           → PostgreSQL + Edge Functions (Deno/TypeScript)
.github/workflows/  → CI/CD pipelines
docs/               → Product, design, research, legal docs
```

## Development

```bash
# Frontend
pnpm dev              # Start Next.js dev server (uses remote Supabase)
pnpm type-check       # Check TypeScript
pnpm lint            # Run ESLint

# Supabase (schema/functions — targets the remote project)
pnpm supabase:push           # Apply migrations to remote DB
pnpm supabase:functions:deploy # Deploy Edge Functions to remote
```

## Deployment

- **Frontend:** Vercel (automatic on push to main)
- **Backend:** Supabase (automatic Edge Function deploy on push)
- **Database:** Migrations auto-applied via GitHub Actions

## Tech Stack Details

See [TECHPLAN.md](docs/technical/TECHPLAN.md) for:
- Architecture diagram
- Database schema
- Edge Functions
- API design
- Authentication & Authorization
- Storage buckets
- Frontend architecture
- Deployment pipeline
