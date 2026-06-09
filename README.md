# BS-PASS

AI-powered music project management for independent artists.

**Stack:** Next.js 14 · Supabase · Vercel · TypeScript

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local Supabase stack
pnpm supabase:start

# Run frontend dev server
pnpm dev

# Visit http://localhost:3000
```

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
# Supabase
pnpm supabase:start          # Start local DB + functions
pnpm supabase:push           # Apply migrations
pnpm supabase:functions:serve # Serve Edge Functions locally

# Frontend
pnpm dev              # Start Next.js dev server
pnpm type-check       # Check TypeScript
pnpm lint            # Run ESLint
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
