# TECHPLAN.md — AI Music Management App (MVP)

**Version:** 2.0  
**Date:** June 7, 2026  
**Author:** Solo Developer  
**Stack:** Next.js · Supabase (Edge Functions, DB, Auth, Storage, Realtime) · Vercel  
**Scope:** Projects feature — end-to-end MVP

---

## 1. Architecture Overview

This document translates the 51-acceptance-criteria MVP spec into concrete technical decisions for a solo developer. Every decision is weighted against shipping speed, operational simplicity, and the real constraints of a one-person team building toward product-market fit.

### 1.1 Core Philosophy

**One platform. No second server.**

The original plan had a dedicated FastAPI backend running on Railway. That's been removed. Everything — business logic, agent, auth, storage, realtime — runs on a single Supabase project. The frontend (Next.js on Vercel) calls Supabase directly for standard CRUD and calls Supabase Edge Functions for anything that requires server-side logic (agent actions, signature token generation, PDF export, email dispatch).

This eliminates: a second deployment pipeline, a second environment to manage, Python dependency hell, Docker, and Railway's operational overhead. The trade-off is that all server-side logic is written in TypeScript/Deno instead of Python. That is an acceptable trade.

### 1.2 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  VERCEL                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 (App Router)                                 │   │
│  │  - React Server Components (initial render, layouts)     │   │
│  │  - Client Components (interactive UI, realtime)          │   │
│  │  - /api/splits/sign/[token] (public signature page)      │   │
│  └──────────────┬───────────────────────────────────────────┘   │
└─────────────────┼────────────────────────────────────────────────┘
                  │ Supabase JS client (direct DB + Storage + Realtime)
                  │ + fetch() to Edge Functions for agent/email/PDF
                  │
┌─────────────────▼────────────────────────────────────────────────┐
│  SUPABASE                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (all structured data + RLS enforcement)      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Auth (JWT, email/password, OAuth)                       │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Storage (stems, covers, exports — 6 buckets)            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Realtime (chat, notifications, task updates)            │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  Edge Functions (Deno/TypeScript — server-side logic)    │   │
│  │  ├── agent/generate-roadmap                              │   │
│  │  ├── agent/process-event                                 │   │
│  │  ├── splits/request-signatures  (email dispatch)        │   │
│  │  ├── splits/sign                (token validation)      │   │
│  │  ├── splits/generate-pdf        (on-demand, no storage) │   │
│  │  └── notifications/send-email                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Gemini API     │
                  │  (called from   │
                  │  Edge Functions)│
                  └─────────────────┘
```

### 1.3 Key Architecture Decisions

| Original Plan | MVP Decision | Reason |
|---|---|---|
| FastAPI on Railway | Supabase Edge Functions (Deno/TS) | One platform; no second deployment or server to manage |
| MongoDB for chat/audit logs | PostgreSQL (same Supabase DB) | No second database |
| Redis for cache | None for MVP | No need at this scale; Supabase handles it |
| AWS S3 for stems | Supabase Storage | Built-in, same auth model |
| Custom WebSocket server | Supabase Realtime | Managed, zero extra infra |
| Separate auth service | Supabase Auth | JWT-based, handles OAuth |
| Firebase analytics | PostHog | Better product analytics: funnels, session replays, feature flags; free up to 1M events/month |
| Elasticsearch | PostgreSQL full-text search | Search needs are simple; no separate platform needed |
| dnd-kit drag-and-drop | Move Up/Down controls | Same outcome, fraction of the engineering effort |
| AI stem separation | Manual stem uploads | Validates core product without GPU infrastructure |
| Always-on PDF storage | On-demand generation, no storage | Reduces storage costs; PDFs are generated and immediately downloaded |

---

## 2. Tech Stack

### 2.1 Frontend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.x | RSC for layouts/initial render; Client Components for interactivity |
| Language | TypeScript | 5.x | Strict mode on |
| Styling | Tailwind CSS | 3.x | Utility-first; no design system overhead |
| UI Components | shadcn/ui | latest | Unstyled primitives; fast to customize |
| State (server) | TanStack Query | 5.x | Data fetching, caching, optimistic updates |
| State (local) | Zustand | 4.x | Offline queue, UI-only state |
| Realtime | Supabase JS client | 2.x | Chat, notifications, task updates |
| Forms | React Hook Form + Zod | latest | Typed validation; Zod schemas shared with Edge Functions |
| File uploads | Supabase Storage JS | 2.x | Direct browser → Storage via signed URLs |
| Audio preview | WaveSurfer.js | 7.x | Stem waveform display + A/B version comparison |
| Offline queue | idb (IndexedDB wrapper) | latest | Queue writes when offline; flush on reconnect |
| PDF export | @react-pdf/renderer | 3.x | Client-side generation; no server round-trip |
| Analytics | PostHog JS | 1.x | Event tracking, funnels, session replay |
| Error monitoring | Sentry | 7.x | Frontend error tracking |

### 2.2 Backend (Supabase Edge Functions)

All server-side logic runs as Supabase Edge Functions — TypeScript on the Deno runtime. No separate server, no Docker, no Railway.

| Concern | Approach |
|---|---|
| Language | TypeScript (Deno runtime) |
| Validation | Zod (same library as frontend) |
| Auth | Supabase JWT — auto-verified by Edge Function runtime |
| Database access | Supabase service role client (bypasses RLS where needed for agent writes) |
| LLM | Gemini REST API via fetch() — no SDK needed |
| Email | Resend via `npm:resend@4` (Deno) |
| Rate limiting | Upstash Redis rate-limit library (free tier) |

### 2.3 Infrastructure

| Service | Use | Cost |
|---|---|---|
| Vercel | Next.js hosting | Free (Hobby) |
| Supabase | Everything backend | Free (up to 500MB DB, 1GB Storage, 2M Edge Function invocations/month) |
| Gemini API | LLM for agent | Free tier to start |
| Resend | Transactional email | Free (3,000 emails/month) |
| PostHog | Product analytics | Free (1M events/month) |
| Sentry | Error monitoring | Free (5K errors/month) |
| Upstash Redis | Edge Function rate limiting | Free (10K requests/day) |

**Total estimated cost for MVP:** $0/month until scale

---

## 3. Database Schema

### 3.1 Schema Design Principles

- All tables use `uuid` primary keys (Supabase default via `gen_random_uuid()`)
- Soft deletes via `deleted_at TIMESTAMPTZ NULL` — no hard deletes in MVP
- `created_at` / `updated_at` on every table; `updated_at` auto-set via trigger
- Audit trail in a dedicated append-only `audit_logs` table
- JSONB used only for truly schemaless payloads (agent learning rules, notification preferences)
- All splits validation (100% sum) enforced at the Edge Function layer, not DB triggers

### 3.2 Core Tables

```sql
-- ─────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  global_notif_prefs JSONB DEFAULT '{"tasks":true,"chat":true,"signatures":true,"digest":"realtime"}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- USER AGENT PREFERENCES (rule-based learning store)
-- ─────────────────────────────────────────────────────────
CREATE TABLE user_agent_preferences (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  avoided_task_types        TEXT[] DEFAULT '{}',
  preferred_timeline_buffer_days INTEGER DEFAULT 0,
  preferred_agent_mode      TEXT DEFAULT 'moderate',
  auto_assign_roles         JSONB DEFAULT '{}',  -- {"mixing_engineer": <collab_id>}
  learning_enabled          BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- PROJECTS
-- ─────────────────────────────────────────────────────────
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES profiles(id),
  title           TEXT NOT NULL,
  project_type    TEXT NOT NULL CHECK (project_type IN ('album','ep','single','mixtape')),
  cover_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'in_pre_production'
                    CHECK (status IN ('in_pre_production','in_production',
                                      'in_post_production','ready_for_release','released')),
  timeline_start  DATE,
  timeline_end    DATE,
  budget_level    TEXT CHECK (budget_level IN ('indie','independent','mid_level','major')),
  genre           TEXT,
  agent_mode      TEXT NOT NULL DEFAULT 'moderate'
                    CHECK (agent_mode IN ('aggressive','moderate','minimal')),
  auto_tasks_enabled BOOLEAN NOT NULL DEFAULT true,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- COLLABORATOR ROLES (predefined — seeded at deploy)
-- ─────────────────────────────────────────────────────────
-- Valid role values (enforced in application layer + frontend dropdown):
--   main_artist, featured_artist, producer, co_producer,
--   recording_engineer, mixing_engineer, mastering_engineer,
--   songwriter, session_musician, background_vocalist,
--   manager, ar, graphic_designer, video_director, marketing
--
-- Stored as TEXT[] on collaborators.roles — validated against this list
-- in the invite Edge Function before insert.

CREATE TABLE collaborator_role_definitions (
  slug         TEXT PRIMARY KEY,  -- e.g. 'mixing_engineer'
  label        TEXT NOT NULL,     -- e.g. 'Mixing Engineer'
  sort_order   INTEGER NOT NULL
);

-- Seeded in seed.sql:
-- INSERT INTO collaborator_role_definitions VALUES
--   ('main_artist',         'Main Artist',          1),
--   ('featured_artist',     'Featured Artist',      2),
--   ('producer',            'Producer',             3),
--   ('co_producer',         'Co-Producer',          4),
--   ('recording_engineer',  'Recording Engineer',   5),
--   ('mixing_engineer',     'Mixing Engineer',      6),
--   ('mastering_engineer',  'Mastering Engineer',   7),
--   ('songwriter',          'Songwriter',           8),
--   ('session_musician',    'Session Musician',     9),
--   ('background_vocalist', 'Background Vocalist', 10),
--   ('manager',             'Manager',             11),
--   ('ar',                  'A&R',                 12),
--   ('graphic_designer',    'Graphic Designer',    13),
--   ('video_director',      'Video Director',      14),
--   ('marketing',           'Marketing',           15);

-- ─────────────────────────────────────────────────────────
-- COLLABORATORS
-- All collaborators must be registered users (profiles).
-- There is no guest or token-only access to projects.
-- ─────────────────────────────────────────────────────────
CREATE TABLE collaborators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  roles           TEXT[] NOT NULL DEFAULT '{}',  -- values must exist in collaborator_role_definitions
  status          TEXT NOT NULL DEFAULT 'invited'
                    CHECK (status IN ('invited','active','removed')),
  is_main_artist  BOOLEAN NOT NULL DEFAULT false,
  invited_at      TIMESTAMPTZ DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  removed_at      TIMESTAMPTZ,
  notif_prefs     JSONB DEFAULT '{"tasks":true,"chat":true,"signatures":true,"digest":"realtime"}',
  muted_user_ids  UUID[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ─────────────────────────────────────────────────────────
-- TRACKS
-- ─────────────────────────────────────────────────────────
CREATE TABLE tracks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  bpm             SMALLINT,
  key             TEXT,
  duration_secs   INTEGER,
  current_status  TEXT NOT NULL DEFAULT 'draft'
                    CHECK (current_status IN ('draft','recording','recorded',
                                               'mixing','mixed','mastering','mastered','released')),
  current_version_id UUID,
  sort_order      INTEGER DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- TRACK VERSIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE track_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  version_label   TEXT NOT NULL DEFAULT 'v-original',
  version_number  INTEGER NOT NULL DEFAULT 1,
  bpm             SMALLINT,
  key             TEXT,
  duration_secs   INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tracks ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES track_versions(id) DEFERRABLE;

-- ─────────────────────────────────────────────────────────
-- STEMS
-- ─────────────────────────────────────────────────────────
CREATE TABLE stems (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id                UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  track_version_id        UUID NOT NULL REFERENCES track_versions(id),
  name                    TEXT NOT NULL,
  storage_path            TEXT NOT NULL,
  file_size_bytes         BIGINT,
  duration_secs           INTEGER,
  current_stem_version_id UUID,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stem_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stem_id         UUID NOT NULL REFERENCES stems(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL DEFAULT 1,
  storage_path    TEXT NOT NULL,
  uploaded_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stems ADD CONSTRAINT fk_current_stem_version
  FOREIGN KEY (current_stem_version_id) REFERENCES stem_versions(id) DEFERRABLE;

-- ─────────────────────────────────────────────────────────
-- TASKS (roadmap)
-- ─────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started','in_progress','complete')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high')),
  assignee_id     UUID REFERENCES profiles(id),
  due_date        DATE,
  created_by      TEXT NOT NULL DEFAULT 'user'
                    CHECK (created_by IN ('user','agent')),
  plugin_name     TEXT,
  sort_order      INTEGER DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- TASK DEPENDENCIES
-- ─────────────────────────────────────────────────────────
CREATE TABLE task_dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, depends_on_id)
);

-- ─────────────────────────────────────────────────────────
-- ROADMAP TEMPLATES (seeded at deploy time, not user-created)
-- ─────────────────────────────────────────────────────────
CREATE TABLE roadmap_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type    TEXT NOT NULL CHECK (project_type IN ('album','ep','single','mixtape')),
  title           TEXT NOT NULL,
  tasks           JSONB NOT NULL,  -- array of template task objects
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- SPLITS
-- ─────────────────────────────────────────────────────────
CREATE TABLE splits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id          UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  collaborator_id   UUID NOT NULL REFERENCES collaborators(id),
  percentage        NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  signed_at         TIMESTAMPTZ,
  signed_ip         TEXT,
  signature_token   TEXT UNIQUE,
  token_expires_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(track_id, collaborator_id)
);

-- ─────────────────────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────────────────────
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES profiles(id),
  sender_type     TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user','agent')),
  body            TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  mentions        UUID[] DEFAULT '{}',
  mention_all     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- AUDIT LOGS (append-only — no updates, no deletes)
-- ─────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id),
  actor_id        UUID REFERENCES profiles(id),
  actor_type      TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user','agent')),
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  action          TEXT NOT NULL,
  diff            JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  project_id      UUID REFERENCES projects(id),
  type            TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Indexes

```sql
CREATE INDEX idx_tracks_project_id       ON tracks(project_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project_id        ON tasks(project_id)        WHERE deleted_at IS NULL;
CREATE INDEX idx_splits_track_id         ON splits(track_id);
CREATE INDEX idx_chat_project_id         ON chat_messages(project_id);
CREATE INDEX idx_audit_project_entity    ON audit_logs(project_id, entity_type, entity_id);
CREATE INDEX idx_notifications_user      ON notifications(user_id)   WHERE read_at IS NULL;
CREATE INDEX idx_collaborators_proj_user ON collaborators(project_id, user_id);
CREATE INDEX idx_splits_token            ON splits(signature_token)  WHERE signature_token IS NOT NULL;
```

### 3.4 Row-Level Security (RLS)

All tables have RLS enabled. Key policies:

- **Access requires authentication:** No part of the app — including projects, splits, chat, or signature pages — is accessible without a valid Supabase session. All routes are behind an auth guard.
- **Read access:** Any active collaborator on a project can read all project data
- **Write access:** Any active collaborator can create tasks, post chat messages, update task status
- **Restricted writes:** Only the main artist (`is_main_artist = true`) can update splits, invite/remove collaborators, update project settings, delete tracks/stems
- **Audit logs:** Insert-only via service role (Edge Functions); no user can directly insert or modify
- **Signature signing:** The `splits/sign` Edge Function verifies the authenticated user's `user_id` matches the `collaborator_id` on the split before recording a signature

RLS policies live in `supabase/migrations/` and are applied via `supabase db push`.

---

## 4. Edge Functions

Supabase Edge Functions replace the FastAPI server. Each function is a small, focused TypeScript module. They share a common auth middleware that decodes the Supabase JWT.

### 4.1 Function Inventory

```
supabase/functions/
├── agent-generate-roadmap/     # Called on project creation + manual regenerate
├── agent-process-event/        # Called after track status change, task complete, collab added/removed
├── splits-request-signatures/  # Generates tokens + sends emails via Resend
├── splits-sign/                # Validates token, records signature, posts to chat
├── splits-generate-pdf/        # Generates PDF bytes, returns as download (no storage)
├── notifications-send-email/   # Sends transactional emails (invite, task digest)
└── _shared/
    ├── auth.ts                 # JWT verification middleware
    ├── db.ts                   # Supabase service role client
    ├── gemini.ts               # Gemini REST API wrapper (gemini-2.0-flash)
    ├── resend.ts               # Resend email wrapper
    └── project-status.ts       # compute_project_status() — shared pure function
```

### 4.2 Agent Edge Functions in Detail

#### `agent-generate-roadmap`

Triggered when:
- A project is created
- User clicks "Regenerate Roadmap"

Execution flow:
```
1. Authenticate caller (JWT check)
2. Load project context from DB:
   - project_type, agent_mode, timeline, budget_level, genre
   - existing tracks + statuses
   - collaborator roles
   - existing task titles (to avoid duplicates)
3. Load user's agent preferences (avoided_task_types, buffer days, etc.)
4. Load roadmap template for project_type
5. Call Gemini with:
   - System prompt: "You are an AI music manager. Customize this template."
   - Template tasks as starting point
   - Project context as structured JSON
   - Avoided task types from user preferences
6. Parse Gemini response (structured JSON output — retried once on parse failure)
7. Write tasks to DB (batch insert)
8. Set task dependencies (batch insert to task_dependencies)
9. Post @Here message to chat
10. Write to audit_logs
```

#### `agent-process-event`

Triggered after any significant domain event. Called asynchronously from the frontend — user does not wait for it.

Events handled:
```typescript
type AgentEvent =
  | { type: 'track.status_changed'; trackId: string; newStatus: string }
  | { type: 'task.completed'; taskId: string }
  | { type: 'collaborator.added'; collaboratorId: string }
  | { type: 'collaborator.removed'; collaboratorId: string }
```

Agent behavior per event:
- `track.status_changed` → check if relevant role task exists; create if missing; update project status; post to chat
- `task.completed` → check for unlocked dependent tasks; notify assignees; update learned preferences if user deleted/completed patterns emerge
- `collaborator.added` → match collaborator roles to unassigned tasks; auto-reassign; post to chat
- `collaborator.removed` → reassign their tasks to Unassigned; post to chat

### 4.3 Agent Guardrails

These are hard-coded constraints, not settings:

| Rule | Detail |
|---|---|
| Max tasks per trigger | 5 — no spam |
| Debounce | 30s minimum between triggers for the same project |
| No external calls | Agent cannot call Spotify, email, or any external API |
| No destructive actions | Agent cannot delete tasks, change splits, or modify project settings |
| No financial operations | Agent cannot process payments or modify split percentages |
| All actions logged | Every agent write goes to `audit_logs` |
| User override always available | Any agent-created task can be deleted by any collaborator |

### 4.4 Agent Autonomy Model (Version A)

The agent acts immediately on safe operations — no approval queue:

**Agent acts automatically:**
- Creates tasks
- Reassigns tasks by collaborator role
- Posts messages to project chat
- Updates learned preferences

**Agent never acts automatically:**
- Deletes anything
- Modifies split percentages
- Changes project settings
- Sends external emails on behalf of the user

This is what makes the product feel like an AI manager rather than a suggestion widget.

### 4.5 Rule-Based Learning

Learning is stored in `user_agent_preferences`. No ML — just rules derived from observable behavior:

```typescript
// Tracked behaviors that update preferences
const LEARNING_RULES = {
  // User deletes the same task type 3+ times → add to avoided_task_types
  task_deleted: (taskType: string, deleteCount: number) => {
    if (deleteCount >= 3) addToAvoidedTaskTypes(taskType)
  },

  // User consistently extends due dates by N days → add buffer
  due_date_extended: (avgExtensionDays: number) => {
    setPreferredTimelineBuffer(avgExtensionDays)
  },

  // User always assigns a specific collaborator to a role-type task → remember it
  task_assigned: (role: string, collaboratorId: string, assignCount: number) => {
    if (assignCount >= 2) setAutoAssignRole(role, collaboratorId)
  },
}
```

User can reset all learned preferences via Settings → Agent Preferences → "Reset Learning."

### 4.6 Template-Based Roadmap Generation

Rather than asking Gemini to invent a roadmap from scratch, the agent starts from a predefined template and asks Gemini to customize it. This produces more consistent outputs, reduces hallucinations, and cuts API costs.

```typescript
// Template stored in roadmap_templates table (seeded at deploy)
const SINGLE_TEMPLATE = {
  project_type: 'single',
  tasks: [
    { title: 'Finalize recording session', plugin: 'ar', priority: 'high', offset_days: 7 },
    { title: 'Book mixing engineer', plugin: 'ar', priority: 'high', offset_days: 5 },
    { title: 'Mixing', plugin: 'project_management', priority: 'high', offset_days: 21 },
    { title: 'Mastering', plugin: 'project_management', priority: 'high', offset_days: 28 },
    { title: 'Cover art design', plugin: 'creative', priority: 'medium', offset_days: 14 },
    { title: 'Write bio/press release', plugin: 'creative', priority: 'medium', offset_days: 21 },
    { title: 'Plan release rollout', plugin: 'marketing', priority: 'medium', offset_days: 25 },
    { title: 'Pitch to playlists', plugin: 'opportunities', priority: 'low', offset_days: 30 },
  ]
}

// Gemini prompt: customize this template given the project context
// Output: same structure with dates adjusted, tasks added/removed, assignees suggested
```

---

## 5. API Design

### 5.1 URL Structure

```
Standard CRUD:   Supabase JS client → PostgREST (direct DB calls with RLS)
Server logic:    fetch() → Supabase Edge Functions at /functions/v1/<name>
Public routes:   Next.js /api/* (signature page, OAuth callback)
```

The frontend does **not** call a separate API server. Standard data operations (list projects, create track, post chat message, update task status) go directly to Supabase via the JS client. Edge Functions are called only when server-side logic is required.

### 5.2 Operations by Category

**Direct Supabase client (no Edge Function needed):**
```
PROJECTS       → supabase.from('projects').select/insert/update
TRACKS         → supabase.from('tracks').select/insert/update
TRACK VERSIONS → supabase.from('track_versions').select/insert
STEMS          → supabase.from('stems').select/update (upload via Storage)
TASKS          → supabase.from('tasks').select/insert/update
COLLABORATORS  → supabase.from('collaborators').select/update (invite via Edge Fn)
SPLITS         → supabase.from('splits').select (write via Edge Fn for validation)
CHAT           → supabase.from('chat_messages').select/insert
NOTIFICATIONS  → supabase.from('notifications').select/update
SEARCH         → supabase.rpc('search_project', { project_id, query })
```

**Edge Functions (require server-side logic):**
```
POST /functions/v1/agent-generate-roadmap     → generate + insert roadmap tasks
POST /functions/v1/agent-process-event        → async agent follow-up on events
POST /functions/v1/splits-request-signatures  → generate tokens + send emails
POST /functions/v1/splits-sign                → validate token, record signature
GET  /functions/v1/splits-generate-pdf        → return PDF bytes (streamed download)
POST /functions/v1/notifications-send-email   → send invite/digest emails
```

**Next.js API routes:**
```
GET  /api/splits/sign/[token]    → public signature page (no auth required)
GET  /api/auth/callback          → Supabase OAuth callback
```

### 5.3 Response Conventions

- All Supabase client calls follow its built-in `{ data, error }` pattern
- Edge Functions return `{ data: ..., error: null }` or `{ data: null, error: { code, message } }`
- Soft-deleted items excluded by default via `.is('deleted_at', null)` filter
- All timestamps in ISO 8601 UTC
- Pagination uses cursor-based approach: `.gt('created_at', cursor).limit(50)`

### 5.4 File Upload Pattern

```
1. Frontend requests signed upload URL:
   const { data } = await supabase.storage.from('stems').createSignedUploadUrl(path)

2. Frontend uploads directly to Supabase Storage:
   await fetch(data.signedUrl, { method: 'PUT', body: file })

3. Frontend confirms by inserting stem record:
   await supabase.from('stems').insert({ track_id, storage_path: path, ... })
```

---

## 6. Storage Buckets

### 6.1 Bucket Structure

```
covers/                  # public read; authenticated write
  {project_id}/cover.{ext}

tracks/                  # authenticated read/write
  {project_id}/{track_id}/v{n}/{filename}

stems/                   # authenticated read/write
  {project_id}/{track_id}/{stem_id}/v{n}/{filename}
```

### 6.2 File Size Limits

| File Type | Max Size | Allowed MIME types |
|---|---|---|
| Cover art | 5 MB | image/jpeg, image/png, image/webp |
| Track audio | 500 MB | audio/mpeg, audio/wav, audio/flac, audio/aac, audio/ogg |
| Stem audio | 500 MB | audio/mpeg, audio/wav, audio/flac, audio/aac, audio/ogg |

---

## 7. Frontend Architecture

### 7.1 Route Structure (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (app)/
│   ├── layout.tsx                      # auth guard, global nav, notification subscription
│   ├── projects/
│   │   ├── page.tsx                    # project list
│   │   └── [id]/
│   │       ├── layout.tsx              # project shell + tab nav
│   │       ├── page.tsx                # redirect → tracks
│   │       ├── tracks/page.tsx
│   │       ├── roadmap/page.tsx
│   │       ├── stems/page.tsx
│   │       ├── chat/page.tsx
│   │       ├── collaborators/page.tsx
│   │       └── splits/page.tsx
└── api/
    ├── auth/callback/route.ts          # Supabase OAuth callback
    └── splits/sign/[token]/page.tsx    # public signature page (no auth required)
```

### 7.2 Data Fetching Strategy

| Data | Method | Reason |
|---|---|---|
| Project list | RSC + TanStack Query | Server render first; client keeps fresh |
| Project detail | RSC | Full server render on load |
| Tasks / Roadmap | TanStack Query (client) | Mutation-heavy; optimistic updates needed |
| Chat messages | Supabase Realtime | Live subscription |
| Notifications | Supabase Realtime | Real-time badge count |
| Splits | TanStack Query (client) | Mutation-heavy; validation on update |
| Stems | TanStack Query (client) | Upload state management |

### 7.3 Realtime Subscriptions

```typescript
// Chat — mounted in ChatTab
supabase
  .channel(`project:${projectId}:chat`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages',
      filter: `project_id=eq.${projectId}` }, handleNewMessage)
  .subscribe()

// Notifications — mounted in app layout (global)
supabase
  .channel(`user:${userId}:notifications`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}` }, handleNewNotification)
  .subscribe()

// Task updates — mounted in RoadmapTab
supabase
  .channel(`project:${projectId}:tasks`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',
      filter: `project_id=eq.${projectId}` }, invalidateTasksQuery)
  .subscribe()
```

### 7.4 Offline Support

```
Scope (MVP):
  ✓ Task status updates
  ✓ Chat messages
  ✓ Track status changes
  ✓ Task creation (text only)
  ✗ File uploads — require active connection; show clear error
  ✗ Agent triggers — require server; queue and flush on reconnect
  ✗ PDF generation — requires server; not available offline

Implementation:
  - IndexedDB (via idb) stores pending_writes: [{ table, method, payload, timestamp }]
  - navigator.onLine event triggers flush
  - Conflict on flush: show "Sync conflict" banner; user resolves manually
  - Offline banner shown in UI when navigator.onLine === false
```

### 7.5 Component Architecture

```
components/
├── projects/
│   ├── ProjectCard.tsx
│   ├── NewProjectModal.tsx
│   └── ProjectSettingsModal.tsx
├── tracks/
│   ├── TrackList.tsx
│   ├── TrackItem.tsx
│   ├── TrackStatusBadge.tsx
│   ├── AddTrackModal.tsx
│   ├── TrackVersionPanel.tsx
│   └── ABComparePlayer.tsx             # WaveSurfer.js
├── roadmap/
│   ├── TaskList.tsx
│   ├── TaskItem.tsx                    # includes Move Up / Move Down controls
│   ├── AddTaskModal.tsx
│   ├── DependencyIndicator.tsx         # "Blocked by X" / "Blocks Y" labels
│   └── RoadmapProgressBar.tsx
├── stems/
│   ├── StemList.tsx
│   ├── StemItem.tsx
│   ├── StemUploadModal.tsx
│   └── StemVersionPanel.tsx
├── chat/
│   ├── ChatFeed.tsx
│   ├── ChatMessage.tsx                 # [deleted] state, agent vs user styling
│   ├── MentionInput.tsx                # @mention autocomplete dropdown
│   └── AgentMessage.tsx
├── collaborators/
│   ├── CollaboratorList.tsx
│   ├── InviteModal.tsx
│   └── RemoveCollaboratorModal.tsx     # split reassignment flow
├── splits/
│   ├── SplitsPanel.tsx
│   ├── SplitRow.tsx
│   ├── SplitAuditLog.tsx
│   ├── SignatureStatusBadge.tsx        # red/yellow/green
│   └── RequestSignaturesModal.tsx
└── shared/
    ├── UndoToast.tsx
    ├── OfflineBanner.tsx
    ├── ConfirmDialog.tsx
    └── SearchModal.tsx
```

---

## 8. Authentication & Authorization

### 8.1 Auth Flow

```
1. User calls supabase.auth.signInWithPassword() or OAuth
2. Supabase returns JWT access token + refresh token
3. Supabase JS client attaches JWT automatically to all subsequent requests
4. Edge Functions receive JWT in Authorization header; Supabase runtime verifies it
5. RLS policies on all tables use auth.uid() to enforce row-level access
```

No session state on any server. Stateless JWT everywhere.

### 8.2 Authorization Model (MVP — No Full RBAC)

| Action | Who Can |
|---|---|
| Create / delete project | Main Artist only |
| Update project settings | Main Artist only |
| Invite / remove collaborators | Main Artist only |
| Create, edit, delete tasks | Any active collaborator |
| Complete a task | Assigned collaborator OR Main Artist |
| Update split percentages | Main Artist only |
| Request signatures | Main Artist only |
| Sign splits | Active collaborator only (must be a registered user; token link redirects to login if not authenticated) |
| Post chat messages | Any active collaborator |
| Delete own chat message | Message sender only |
| Delete tracks / stems | Main Artist only |
| View all project data | Any active collaborator |

Enforced by: RLS policies (database layer) + Edge Function checks (service layer). Both must pass.

---

## 9. Digital Signatures

### 9.1 Implementation (Token-Based, No DocuSign)

```
1. Main Artist clicks "Request Signatures"
2. Edge Function: splits-request-signatures
   - Generates a UUID token per (split, collaborator) pair
   - Sets token_expires_at = now() + 7 days
   - Stores token in splits.signature_token
   - Sends email via Resend with link:
     https://musicapp.com/splits/sign/{token}
   - Posts to chat: "@[Collab1] @[Collab2] Review and sign splits for [Track]"
   - Writes to audit_logs

3. Collaborator opens link
   - If not authenticated → redirected to login, then back to signature page
   - Edge Function validates token belongs to the authenticated user's collaborator record
   - Shows: project name, track, their percentage, other parties

4. Collaborator clicks "I Agree and Sign"
5. Edge Function: splits-sign
   - Validates token exists + not expired + not already used
   - Records: signed_at, signed_ip
   - Nullifies token (single-use)
   - Posts to chat: "@Here [Collaborator] signed splits for [Track]"
   - Writes to audit_logs
   - Checks if all collaborators signed → if yes, updates project status logic
```

### 9.2 Legal Disclaimer

This is a lightweight audit trail — timestamp, IP, explicit consent click — not a legally certified e-signature. A disclaimer must appear:
- On the signature page before the "I Agree" button
- In the generated PDF
- In the app's Terms of Service

Upgrade path: DocuSign/HelloSign API integration in Phase 2.

---

## 10. Track Status → Project Status

Pure function, run after every track status change. Implemented in `supabase/functions/_shared/project-status.ts` and used by both Edge Functions and the frontend for optimistic updates.

```typescript
const TRACK_STATUS_RANK: Record<string, number> = {
  draft: 1, recording: 2, recorded: 3,
  mixing: 4, mixed: 5, mastering: 6, mastered: 7, released: 8,
}

export function computeProjectStatus(
  tracks: { current_status: string }[],
  splits: { signed_at: string | null }[]
): string {
  if (!tracks.length) return 'in_pre_production'

  const allReleased = tracks.every(t => t.current_status === 'released')
  if (allReleased) return 'released'

  const allMasteredOrReleased = tracks.every(
    t => ['mastered', 'released'].includes(t.current_status)
  )
  const allSplitsSigned = splits.length > 0 && splits.every(s => s.signed_at !== null)

  if (allMasteredOrReleased && allSplitsSigned) return 'ready_for_release'

  const bottleneckRank = Math.min(...tracks.map(t => TRACK_STATUS_RANK[t.current_status]))

  if (bottleneckRank <= 2) return 'in_pre_production'
  if (bottleneckRank <= 4) return 'in_production'
  return 'in_post_production'
}
```

---

## 11. Search

PostgreSQL full-text search. No Elasticsearch.

```sql
-- Stored function called via supabase.rpc('search_project', { p_project_id, p_query })
CREATE OR REPLACE FUNCTION search_project(p_project_id UUID, p_query TEXT)
RETURNS TABLE(result_type TEXT, result_id UUID, title TEXT, snippet TEXT) AS $$
  SELECT 'task', id, title, description
  FROM tasks
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND to_tsvector('english', title || ' ' || COALESCE(description, ''))
        @@ plainto_tsquery('english', p_query)
  UNION ALL
  SELECT 'track', id, title, NULL
  FROM tracks
  WHERE project_id = p_project_id
    AND deleted_at IS NULL
    AND to_tsvector('english', title) @@ plainto_tsquery('english', p_query)
  UNION ALL
  SELECT 'chat', id, NULL, body
  FROM chat_messages
  WHERE project_id = p_project_id
    AND is_deleted = false
    AND to_tsvector('english', body) @@ plainto_tsquery('english', p_query)
$$ LANGUAGE sql STABLE;
```

---

## 12. Analytics

PostHog replaces Firebase. All events tracked client-side via `posthog-js`.

### 12.1 Key Events

```typescript
// Project events
posthog.capture('project_created', { project_type, has_timeline, has_budget })
posthog.capture('project_status_changed', { from_status, to_status })

// Track events
posthog.capture('track_added', { track_count_in_project })
posthog.capture('track_status_changed', { from_status, to_status })

// Agent events
posthog.capture('agent_tasks_generated', { plugin_name, task_count, trigger })
posthog.capture('agent_task_deleted', { plugin_name, task_title })  // feeds learning
posthog.capture('roadmap_regenerated')

// Collaboration events
posthog.capture('collaborator_invited', { role_count })
posthog.capture('collaborator_accepted')

// Splits events
posthog.capture('splits_requested', { track_count, collaborator_count })
posthog.capture('split_signed')
posthog.capture('splits_pdf_downloaded')

// Product health
posthog.capture('offline_queue_flushed', { queued_action_count })
posthog.capture('stem_uploaded', { file_size_mb })
```

---

## 13. Deployment

### 13.1 Infrastructure

```
┌─────────────────────────────────────────┐
│  VERCEL (Hobby — free)                  │
│  - Next.js 14                           │
│  - Env: NEXT_PUBLIC_SUPABASE_URL        │
│         NEXT_PUBLIC_SUPABASE_ANON_KEY   │
│         NEXT_PUBLIC_POSTHOG_KEY         │
│         NEXT_PUBLIC_SENTRY_DSN          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  SUPABASE (free tier)                   │
│  - PostgreSQL, Auth, Storage, Realtime  │
│  - Edge Functions (Deno runtime)        │
│  - Env (Edge Function secrets):         │
│    GEMINI_API_KEY                       │
│    RESEND_API_KEY                       │
│    RESEND_FROM_EMAIL                    │
│    APP_BASE_URL                         │
│    UPSTASH_REDIS_REST_URL               │
│    UPSTASH_REDIS_REST_TOKEN             │
└─────────────────────────────────────────┘
```

### 13.2 CI/CD

| Branch | Action |
|---|---|
| `main` | Deploy to Vercel production + `supabase functions deploy` |
| `develop` | Vercel preview URL + Supabase staging project |
| PRs | Vercel preview URL |

GitHub Actions workflow:
1. `tsc --noEmit` on Next.js
2. `deno check` on Edge Functions
3. `supabase db push --dry-run` (migration check)
4. Deploy on merge to `main`

### 13.3 Local Development

This project uses a **remote Supabase project** for development. No local Docker stack is required.

```bash
# Start Next.js dev server (connects to remote Supabase via apps/web/.env.local)
pnpm dev

# Apply schema migrations to remote DB
pnpm supabase:push

# Serve Edge Functions locally against remote DB (Deno runtime required)
pnpm supabase:functions:serve

# Deploy Edge Functions to remote Supabase
pnpm supabase:functions:deploy
```

---

## 14. Development Phases

### Phase 1 — Foundation (Weeks 1–2)

**Goal:** Auth, project CRUD, track management, project status logic

- [ ] Supabase project setup (migrations, RLS policies, storage buckets, seed templates)
- [ ] Next.js scaffold (App Router, auth flow, Supabase client setup, PostHog init)
- [ ] Project CRUD (create, list, detail, settings modal)
- [ ] Track CRUD (create, status update, status badge)
- [ ] `compute_project_status()` logic — shared function, unit tested
- [ ] Basic chat (no realtime yet — TanStack Query polling)
- [ ] Sentry error monitoring wired up

**Milestone:** Create a project, add tracks, update statuses, see project status update automatically.

---

### Phase 2 — Agent + Roadmap (Weeks 3–4)

**Goal:** Agent generates roadmaps from templates; user manages tasks

- [ ] Roadmap templates seeded for all 4 project types
- [ ] `agent-generate-roadmap` Edge Function (template → Gemini customization → task insert)
- [ ] `agent-process-event` Edge Function (track status change → follow-up tasks)
- [ ] Task CRUD (create, update, complete, soft delete)
- [ ] Task dependencies (create, display, validation before complete)
- [ ] Roadmap tab UI (task list, progress bar, Move Up/Down, dependency indicators)
- [ ] Chat realtime via Supabase Realtime
- [ ] Agent posts to chat on every action

**Milestone:** Create a project → agent generates roadmap → change track status → agent creates follow-up tasks → all visible in chat in real time.

---

### Phase 3 — Collaboration + Splits (Weeks 5–6)

**Goal:** Multi-collaborator projects, revenue splits, digital signatures

- [ ] Collaborator invite flow (search registered users by name/email, select predefined role(s), Resend email with project link, accept redirects to app)
- [ ] `agent-process-event` handles collaborator.added (role → task auto-reassign)
- [ ] `agent-process-event` handles collaborator.removed (tasks → Unassigned)
- [ ] Splits CRUD (agent auto-populate on project init, main artist override)
- [ ] 100% sum validation in Edge Function
- [ ] Split audit log (displayed in Splits tab)
- [ ] `splits-request-signatures` Edge Function (tokens + Resend)
- [ ] Public signature page (`/splits/sign/[token]`)
- [ ] `splits-sign` Edge Function (validate, record, post to chat)
- [ ] Signature status badges (red/yellow/green)
- [ ] `splits-generate-pdf` Edge Function (on-demand, streamed download)

**Milestone:** Full multi-collaborator flow — invite → splits auto-populated → main artist adjusts → requests signatures → collaborator signs via email link → status turns green.

---

### Phase 4 — Stems + Polish (Weeks 7–8)

**Goal:** Stem management, versioning, offline support, remaining agent plugins, learning

- [ ] Stem upload flow (signed URL → direct upload → confirm insert)
- [ ] Stem versioning + rollback
- [ ] Track versioning + A/B comparison (WaveSurfer.js)
- [ ] Offline queue (IndexedDB + flush on reconnect + conflict banner)
- [ ] Soft delete + 30-day recovery (Trash modal in each tab)
- [ ] Undo toast (last action reversible)
- [ ] Remaining agent plugins wired into `agent-process-event` (Marketing, Social, Opportunities, Creative, Booking, Fan)
- [ ] Rule-based learning (task_deleted tracking → `user_agent_preferences` update)
- [ ] Agent preferences UI (toggle learning, reset preferences)
- [ ] Notification preferences UI (per-type toggle, mute per collaborator, digest setting)
- [ ] Search (PostgreSQL `search_project` RPC, frontend search modal)
- [ ] PostHog analytics events instrumented across all key actions

**Milestone:** All 51 acceptance criteria covered. Offline queue working. All agent plugins active. Learning updates on task deletion.

---

### Phase 5 — QA + Launch Prep (Weeks 9–10)

- [ ] Mobile responsiveness audit (iOS Safari, Android Chrome)
- [ ] Load test at 100 concurrent users (k6 or Artillery against Supabase)
- [ ] Security review (OWASP top 10, RLS bypass attempts, token expiry tested)
- [ ] All 51 acceptance criteria manual verification pass
- [ ] Onboarding tutorial (sample project walkthrough in-app)
- [ ] Legal review (ToS, signature disclaimer, privacy policy)
- [ ] Error rates baseline established in Sentry
- [ ] PostHog funnels configured (project creation → first track → roadmap → splits signed)

---

## 15. Security

| Threat | Mitigation |
|---|---|
| Unauthorized project access | RLS: `auth.uid()` must be a collaborator on the project |
| Main artist impersonation | RLS `is_main_artist` check on split/collab write operations |
| Signature token abuse | Tokens are UUID, single-use, expire after 7 days; invalidated immediately on use |
| File upload abuse | Signed URLs generated server-side; MIME type checked; size limits enforced |
| LLM prompt injection | User data passed as structured JSON to Gemini; never string-interpolated into system prompt |
| Agent rate limit abuse | Upstash Redis rate limiter on agent Edge Functions; 1 trigger per 30s per project |
| XSS | Next.js escapes by default; no `dangerouslySetInnerHTML` |
| Secrets exposure | All secrets in Supabase Edge Function env; only `NEXT_PUBLIC_` vars reach the client |
| Audit log tampering | `audit_logs` table: no UPDATE or DELETE allowed via RLS; insert-only via service role |

---

## 16. Testing Strategy

### Unit Tests
- `compute_project_status()` — pure function, high coverage target, test all status transitions
- Split 100% sum validation
- Agent learning rule triggers
- Template task generation (mock Gemini response)

### Integration Tests
- Edge Functions with a real Supabase test project
- Gemini API calls mocked via Deno test stubs
- Signature flow end-to-end (generate token → sign → verify signed state)
- RLS policy tests (collaborator can't update another project's data)

### Frontend Tests
- Vitest + React Testing Library for component logic
- TanStack Query mutation + optimistic update flows
- Offline queue (mock `navigator.onLine`)

### E2E Tests (Phase 5 only — Playwright)
1. Create project → tracks added → agent generates roadmap
2. Invite collaborator → task auto-assigned by role → mark complete
3. Set splits → request signatures → sign via token link → status goes green
4. Track status changed through full lifecycle → project status updates

---

## 17. Performance Targets

| Metric | Target | Approach |
|---|---|---|
| Initial page load (LCP) | < 2s | RSC server render + Vercel CDN |
| Supabase query (P95) | < 300ms | Indexed queries; connection pool via Supabase |
| Edge Function cold start | < 500ms | Deno cold starts are fast; acceptable for agent calls |
| Agent roadmap generation | < 10s | Gemini Flash (fast tier) + loading indicator |
| Stem upload (100 MB) | < 30s | Direct browser → Supabase Storage (no proxy) |
| Chat message delivery | < 500ms | Supabase Realtime |
| PDF generation | < 3s | Client-side `@react-pdf/renderer`; no server round-trip |

---

## 18. Known Trade-offs & Technical Debt

| Item | MVP Decision | Future Fix |
|---|---|---|
| No real AI stem separation | Manual uploads only; "Split Stems" removed from MVP UI | Demucs/Spleeter via async worker service (Phase 3) |
| Signature not legally certified | Token + timestamp + IP + explicit consent click; disclaimer in UI and ToS | DocuSign/HelloSign (Phase 2) |
| No conflict resolution | Last write wins; noted in ToS | Optimistic locking via version counter on rows |
| Agent context is single-project | Sufficient for MVP; agent only sees current project state | Cross-project pattern learning (Phase 3) |
| No image compression | Warn user if cover > 5 MB | `browser-image-compression` (Phase 2) |
| Edge Function cold starts | ~200–500ms on first call; acceptable for agent flows | Warm-up pings or move to persistent compute if needed |
| No real-time task/split sync | Realtime subscription on tasks table; splits refresh on mutation | Already covered by Supabase Realtime subscription |
| Resend free tier (3,000/month) | Fine for beta; upgrade when volume increases | Resend paid plan when needed |

---

## 19. Folder Structure

```
musicapp/
├── apps/
│   └── web/                          # Next.js app (Vercel)
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (app)/
│       │   └── api/
│       ├── components/
│       ├── lib/
│       │   ├── supabase.ts           # Supabase client setup
│       │   ├── posthog.ts            # PostHog client
│       │   └── project-status.ts     # computeProjectStatus() — shared with Edge Fns
│       ├── hooks/                    # TanStack Query hooks per domain
│       ├── stores/                   # Zustand (offline queue, UI state)
│       └── types/                    # Shared TypeScript types
├── supabase/
│   ├── functions/
│   │   ├── agent-generate-roadmap/   # index.ts
│   │   ├── agent-process-event/      # index.ts
│   │   ├── splits-request-signatures/
│   │   ├── splits-sign/
│   │   ├── splits-generate-pdf/
│   │   ├── notifications-send-email/
│   │   └── _shared/                  # auth.ts, db.ts, gemini.ts, resend.ts, project-status.ts
│   ├── migrations/                   # SQL migration files (schema + RLS + indexes)
│   └── seed.sql                      # roadmap templates + dev data
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint, type check, migration dry-run
│       └── deploy.yml                # deploy on merge to main
└── package.json
```

---

## 20. Resolved Decisions

| Original Open Question | Decision |
|---|---|
| Stem splitting scope | Manual uploads only. "Split Stems" button removed from MVP. Users upload pre-separated files. |
| Collaborator login for signing | Token-only. No login required to sign. Reduces friction for collaborators who aren't yet users. |
| Agent LLM model | Gemini 2.0 Flash. Faster, cheaper, sufficient for template customization. Upgrade to Pro if quality is insufficient. |
| Offline conflict strategy | "Sync conflict" banner on flush — list of conflicts, user resolves manually. No silent overwrites. |
| Max collaborators enforcement | DB `CHECK` constraint + Edge Function 422 + frontend disabled invite button at 20. |
| FastAPI vs Edge Functions | Edge Functions. One platform, no second server. Trade-off accepted: TypeScript over Python. |
| Agent autonomy model | Version A. Agent acts immediately on safe operations (task creation, chat posts, reassignment). Never acts on destructive operations (deletes, splits, settings). |

---

*End of TECHPLAN.md*
