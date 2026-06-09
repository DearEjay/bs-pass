#!/bin/bash
# BS-PASS PROJECT SETUP SCRIPT
# Scaffolds entire project structure, dependencies, and config based on TECHPLAN.md
# Usage: bash setup.sh

set -e

PROJECT_ROOT="/Users/ejay.mallard/Downloads/bs-pass"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== BS-PASS PROJECT SETUP ===${NC}\n"

# ─────────────────────────────────────────────────────────
# STEP 1: FOLDER STRUCTURE
# ─────────────────────────────────────────────────────────

echo -e "${YELLOW}[1/5] Creating folder structure...${NC}"

mkdir -p "$PROJECT_ROOT/apps/web"/{app/{auth,{app/projects,api}},components/{ui,projects,tracks,roadmap,stems,chat,collaborators,splits,shared},hooks,lib,stores,types}
mkdir -p "$PROJECT_ROOT/supabase"/{functions/{agent-generate-roadmap,agent-process-event,splits-request-signatures,splits-sign,splits-generate-pdf,notifications-send-email,_shared},migrations}
mkdir -p "$PROJECT_ROOT/.github/workflows"
mkdir -p "$PROJECT_ROOT/docs"/{product,design,research,legal,technical}
mkdir -p "$PROJECT_ROOT/scripts"

echo -e "${GREEN}✓ Folder structure created${NC}\n"

# ─────────────────────────────────────────────────────────
# STEP 2: ROOT FILES
# ─────────────────────────────────────────────────────────

echo -e "${YELLOW}[2/5] Creating root configuration files...${NC}"

# .gitignore
cat > "$PROJECT_ROOT/.gitignore" << 'EOF'
# Dependencies
node_modules/
.pnpm-store/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Environment variables
.env
.env.local
.env.*.local
.env.supabase

# Next.js
.next/
build/
dist/
out/

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Testing
coverage/
.nyc_output/

# Logging
*.log
logs/
npm-debug.log*

# Supabase
supabase/.branches/
supabase/.temp/

# OS
Thumbs.db
EOF

# Root package.json
cat > "$PROJECT_ROOT/package.json" << 'EOF'
{
  "name": "bs-pass",
  "version": "0.1.0",
  "description": "AI-powered music project management for independent artists",
  "private": true,
  "scripts": {
    "dev": "cd apps/web && pnpm dev",
    "build": "cd apps/web && pnpm build",
    "start": "cd apps/web && pnpm start",
    "lint": "cd apps/web && pnpm lint",
    "type-check": "cd apps/web && pnpm type-check",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:push": "supabase db push",
    "supabase:functions:serve": "supabase functions serve",
    "supabase:functions:deploy": "supabase functions deploy"
  },
  "workspaces": [
    "apps/web"
  ],
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
EOF

# pnpm-workspace.yaml
cat > "$PROJECT_ROOT/pnpm-workspace.yaml" << 'EOF'
packages:
  - 'apps/web'
EOF

# Root README.md
cat > "$PROJECT_ROOT/README.md" << 'EOF'
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
EOF

echo -e "${GREEN}✓ Root files created${NC}\n"

# ─────────────────────────────────────────────────────────
# STEP 3: FRONTEND (NEXT.JS)
# ─────────────────────────────────────────────────────────

echo -e "${YELLOW}[3/5] Setting up Next.js frontend...${NC}"

# apps/web/package.json
cat > "$PROJECT_ROOT/apps/web/package.json" << 'EOF'
{
  "name": "bs-pass-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "@tanstack/react-query": "^5.28.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0",
    "shadcn-ui": "latest",
    "@hookform/resolvers": "^3.3.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "wavesurfer.js": "^7.0.0",
    "idb": "^8.0.0",
    "posthog-js": "^1.92.0",
    "@sentry/nextjs": "^7.80.0",
    "@react-pdf/renderer": "^3.13.0",
    "clsx": "^2.0.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "eslint": "^8.52.0",
    "eslint-config-next": "^14.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31"
  }
}
EOF

# apps/web/.env.local.example
cat > "$PROJECT_ROOT/apps/web/.env.local.example" << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Gemini API
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key_here

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# apps/web/next.config.js
cat > "$PROJECT_ROOT/apps/web/next.config.js" << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig
EOF

# apps/web/tsconfig.json
cat > "$PROJECT_ROOT/apps/web/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "outDir": "./.next",
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

# apps/web/tailwind.config.ts
cat > "$PROJECT_ROOT/apps/web/tailwind.config.ts" << 'EOF'
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
EOF

# apps/web/postcss.config.js
cat > "$PROJECT_ROOT/apps/web/postcss.config.js" << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# apps/web/README.md
cat > "$PROJECT_ROOT/apps/web/README.md" << 'EOF'
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
EOF

echo -e "${GREEN}✓ Frontend setup complete${NC}\n"

# ─────────────────────────────────────────────────────────
# STEP 4: SUPABASE (EDGE FUNCTIONS & CONFIG)
# ─────────────────────────────────────────────────────────

echo -e "${YELLOW}[4/5] Setting up Supabase backend...${NC}"

# supabase/functions deno.json
cat > "$PROJECT_ROOT/supabase/functions/deno.json" << 'EOF'
{
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.38.0"
  }
}
EOF

# supabase/.gitignore
cat > "$PROJECT_ROOT/supabase/.gitignore" << 'EOF'
# Supabase local dev
.branches/
.temp/
seed.sql.local

# Environment secrets
.env.supabase
EOF

# supabase/config.toml (stub)
cat > "$PROJECT_ROOT/supabase/config.toml" << 'EOF'
# This file is auto-generated. Use `supabase start` to manage local dev environment.
EOF

# supabase/migrations directory marker
cat > "$PROJECT_ROOT/supabase/migrations/.gitkeep" << 'EOF'
# Migration files go here (auto-numbered, e.g., 20260607_init.sql)
EOF

# supabase/seed.sql (stub - will be populated with roadmap templates)
cat > "$PROJECT_ROOT/supabase/seed.sql" << 'EOF'
-- Seed script for initial data (roadmap templates, collaborator roles, etc.)
-- Run via: supabase db push --db-remote

-- Collaborator role definitions
INSERT INTO collaborator_role_definitions (slug, label, sort_order) VALUES
  ('main_artist', 'Main Artist', 1),
  ('featured_artist', 'Featured Artist', 2),
  ('producer', 'Producer', 3),
  ('co_producer', 'Co-Producer', 4),
  ('recording_engineer', 'Recording Engineer', 5),
  ('mixing_engineer', 'Mixing Engineer', 6),
  ('mastering_engineer', 'Mastering Engineer', 7),
  ('songwriter', 'Songwriter', 8),
  ('session_musician', 'Session Musician', 9),
  ('background_vocalist', 'Background Vocalist', 10),
  ('manager', 'Manager', 11),
  ('ar', 'A&R', 12),
  ('graphic_designer', 'Graphic Designer', 13),
  ('video_director', 'Video Director', 14),
  ('marketing', 'Marketing', 15);

-- TODO: Roadmap templates for each project type (album, ep, single, mixtape)
-- These will be inserted as JSON task structures in roadmap_templates table
EOF

# supabase/README.md
cat > "$PROJECT_ROOT/supabase/README.md" << 'EOF'
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
EOF

echo -e "${GREEN}✓ Supabase backend setup complete${NC}\n"

# ─────────────────────────────────────────────────────────
# STEP 5: ORGANIZE BUSINESS DOCS
# ─────────────────────────────────────────────────────────

echo -e "${YELLOW}[5/5] Organizing documentation folders...${NC}"

# Create docs README with structure
cat > "$PROJECT_ROOT/docs/README.md" << 'EOF'
# BS-PASS Documentation

## Technical

- **[TECHPLAN.md](technical/TECHPLAN.md)** — Complete technical architecture, database schema, Edge Functions, API design, deployment

## Product

- Product specifications and requirements
- Acceptance criteria (51 MVP requirements)
- Roadmap (Phase 2, 3, 4 plans)
- User research

## Design

- Wireframes and UI flows
- Design system and components
- Visual guidelines

## Research

- Market analysis
- Music production workflow research
- User interviews

## Legal

- Terms of Service
- Privacy Policy
- Revenue split agreement template
- Liability & disclaimers
EOF

# Create placeholder files in each docs subfolder
touch "$PROJECT_ROOT/docs/technical/TECHPLAN.md"
touch "$PROJECT_ROOT/docs/product/PRODUCT_SPEC.md"
touch "$PROJECT_ROOT/docs/product/ACCEPTANCE_CRITERIA.md"
touch "$PROJECT_ROOT/docs/product/ROADMAP.md"
touch "$PROJECT_ROOT/docs/design/WIREFRAMES.md"
touch "$PROJECT_ROOT/docs/design/DESIGN_SYSTEM.md"
touch "$PROJECT_ROOT/docs/research/USER_RESEARCH.md"
touch "$PROJECT_ROOT/docs/research/MARKET_ANALYSIS.md"
touch "$PROJECT_ROOT/docs/legal/TERMS_OF_SERVICE.md"
touch "$PROJECT_ROOT/docs/legal/PRIVACY_POLICY.md"

echo -e "${GREEN}✓ Documentation structure created${NC}\n"

# ─────────────────────────────────────────────────────────
# FINAL OUTPUT
# ─────────────────────────────────────────────────────────

echo -e "${GREEN}=== SETUP COMPLETE ===${NC}\n"

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Copy TECHPLAN.md to: docs/technical/TECHPLAN.md"
echo "2. Copy product docs to: docs/product/"
echo "3. Copy design docs to: docs/design/"
echo "4. Copy research docs to: docs/research/"
echo "5. Copy legal docs to: docs/legal/"
echo ""
echo -e "${BLUE}Install dependencies:${NC}"
echo "  cd $PROJECT_ROOT"
echo "  pnpm install"
echo ""
echo -e "${BLUE}Start development:${NC}"
echo "  pnpm supabase:start"
echo "  pnpm dev"
echo ""
echo -e "${BLUE}Verify structure:${NC}"
echo "  tree -L 3 -I 'node_modules'"
echo ""
echo -e "${GREEN}Ready to push to GitHub!${NC}"
