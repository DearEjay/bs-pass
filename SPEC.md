# AI MUSIC MANAGEMENT APP - MVP ACCEPTANCE CRITERIA
## All 51 Requirements Organized by User Journeys

**Last Updated:** June 7, 2026  
**Scope:** Projects (End-to-End Workflow)  
**Target:** Independent Music Artists & AI Manager Agent  

---

# AI MUSIC MANAGEMENT APP - PROJECTS - COMPLETE PRODUCT MANAGEMENT SPECIFICATION
## MVP Acceptance Criteria + Product Strategy

**Last Updated:** June 7, 2026  
**Scope:** Projects (End-to-End Workflow)  
**Target:** Independent Music Artists & AI Manager Agent  
**Status:** Ready for Development

---

## EXECUTIVE SUMMARY

This **AI MUSIC MANAGEMENT APP** is an AI-powered music project management platform designed for independent artists. **Projects** are the core MVP—a complete end-to-end workflow where users create music projects and an intelligent AI Agent (acting as their manager) automates task management, collaborator coordination, and revenue tracking.

**Key Innovation:** Instead of users manually managing every detail, the Agent understands music production workflows and adapts its behavior (plugins/duties) based on project status. As tracks move from Recording → Mixing → Mastering → Release, the agent shifts focus from A&R to Marketing to Fan Engagement.

**MVP Scope:** Users can create a project, add tracks, manage versions, split stems, coordinate collaborators, track revenue splits with digital signatures, and execute the full production-to-release workflow with agent assistance.

**Target Launch:** TBD

---

## PRODUCT GOALS & SUCCESS METRICS

### Primary Goals

1. **Enable Independent Artists to Ship Music Faster**
   - Success Metric: Average time from project creation to "Ready for Release" < 90 days
   - Target: 70% of users report shipping faster than before Backstage

2. **Reduce Manager/Coordination Burden via AI**
   - Success Metric: Users spend < 30 min/week on project admin (vs. 2-3 hours manually)
   - Target: 80% user satisfaction with agent automation

3. **Ensure Fair Revenue Tracking & Transparent Splits**
   - Success Metric: 100% of projects with multi-collaborator splits have audit trail
   - Target: 100% digital signature completion rate for splits (no manual contracts)

4. **Build Sticky, Collaborative Workflow**
   - Success Metric: 80% of projects have 3+ collaborators
   - Target: Collaborators return for second/third projects

### Secondary Goals

1. **Gather Data on Independent Artist Workflows**
   - Understand typical project timelines, team sizes, bottlenecks
   - Use to improve agent intelligence for future versions

2. **Establish Agent-as-Manager Trust**
   - Users should feel the agent understands their project context
   - Agent should rarely suggest irrelevant tasks (false positives < 10%)

3. **Enable Future Expansion**
   - Projects Tab as foundation for future features (Analytics, Distribution, Community)

---

## USER PERSONAS

### Primary: Indie Artist (Solo to Small Team)

**Name:** Alex  
**Background:** Independent hip-hop/R&B artist, 2 years into solo career, 5K Spotify followers  
**Pain Points:**
- Juggling multiple collaborators (producer, engineer, mix engineer, mastering)
- Losing track of who owes what and revenue splits
- No formal contracts; relies on handshake deals
- Forgetting what stage each track is in (recording? mixing?)

**Goals:**
- Release one single every 2 months
- Collaborate without chaos (clear task assignments)
- Transparent revenue tracking (who gets paid what)
- Reduce time spent on admin, focus on creativity

**Tech Comfort:** High (uses Logic Pro, Discord, spreadsheets)

---

### Secondary: Emerging Label/Collective

**Name:** Jordan  
**Background:** Runs small indie label with 3 in-house artists, 2 contract artists  
**Pain Points:**
- Managing multiple projects simultaneously (3-4 in production at once)
- Coordinating external A&R/producers/engineers
- Tracking budgets across projects
- Audit trail for tax/legal purposes

**Goals:**
- Streamline project management across roster
- Reduce friction with external collaborators
- Audit-ready splits/contracts
- Quick onboarding of new artists/projects

**Tech Comfort:** Medium-High (uses project management tools, familiar with workflows)

---

### Tertiary: Feature User (Collaborator)

**Name:** Sam  
**Background:** Mixing engineer, works with 8-10 artists/month  
**Pain Points:**
- Too many Slack/email threads about projects
- Unclear task deadlines/deliverables
- Manual invoicing/split tracking

**Goals:**
- See assigned tasks in one place
- Clear file access and version history
- Automatic notification of deliverables
- Transparent payment/split records

**Tech Comfort:** Medium (uses DAW, familiar with project tools)

---

## PRODUCT POSITIONING

**Category:** Music Project Management + AI-Powered Manager  
**Competitors:** Asana (generic), Airtable (DIY), Trello (simple), Monday (enterprise), Pibox (file-focused)  
**Differentiation:** 
- **Domain-specific** (music production workflows, not generic tasks)
- **AI-driven** (agent adapts behavior, not just software)
- **Revenue-aware** (built-in splits, signatures, audit trails—not afterthought)
- **Independent artist-focused** (affordable, no enterprise pricing)

---

## TECHNICAL ARCHITECTURE (HIGH-LEVEL)

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                  BACKSTAGE FRONTEND                     │
│  (React/TypeScript - Projects Tab)                      │
│  - Project List / Detail View                           │
│  - 6 Sub-tabs (Tracks, Roadmap, Stems, Chat, Collab, Splits)
│  - Responsive Mobile                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
┌────────▼──────────┐      ┌────────▼──────────┐
│  REST/GraphQL API │      │  WebSocket (Chat) │
│                   │      │                   │
└────────┬──────────┘      └────────┬──────────┘
         │                           │
┌────────▼───────────────────────────▼──────────┐
│           BACKSTAGE BACKEND                   │
│  - Project Service                            │
│  - Task/Roadmap Service                       │
│  - Collaborator Service                       │
│  - Splits/Revenue Service                     │
│  - File Service (stems, covers, exports)      │
│  - Chat Service (WebSocket)                   │
│  - Auth Service                               │
└────────┬─────────────────────────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │   AGENT (AI Manager)                │
    │  - Plugins (8 Manager Duties)       │
    │  - Skills (nested task generation)  │
    │  - Learning (pattern recognition)   │
    │  - Context Awareness (project state)│
    └────┬────────────────────────────────┘
         │
    ┌────▼──────────────────┐
    │  LLM Integration      │
    │  (Gemini / Claude)    │
    │  Prompt Engineering   │
    └───────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │     DATA LAYER                            │
    │  - PostgreSQL (projects, tasks, splits)   │
    │  - MongoDB (chat, audit logs)             │
    │  - S3 (stems, covers, exports)            │
    │  - Redis (cache, offline queue)           │
    └──────────────────────────────────────────┘
```

### Agent Architecture

```
Agent (Manager)
├── Creative Director (Plugin)
│   ├── Bio Writing (Skill)
│   ├── Visual Direction (Skill)
│   └── Merch/Content Ideas (Skill)
├── A&R (Plugin)
│   ├── Find Producer (Skill)
│   ├── Find Engineer (Skill)
│   └── Studio Matching (Skill)
├── Project Management (Plugin)
│   ├── Timeline Creation (Skill)
│   ├── Budget Allocation (Skill)
│   └── Dependency Sequencing (Skill)
├── Marketing Management (Plugin)
│   ├── Rollout Planning (Skill)
│   ├── Ad Strategy (Skill)
│   └── Press Kit (Skill)
├── Social Management (Plugin)
│   ├── Content Calendar (Skill)
│   ├── Trend Analysis (Skill)
│   └── Creator Outreach (Skill)
├── Opportunities Manager (Plugin)
│   ├── Playlist Pitching (Skill)
│   ├── Interview Booking (Skill)
│   └── Sync Deal Finding (Skill)
├── Booking Agent (Plugin)
│   ├── Venue Matching (Skill)
│   ├── Tour Planning (Skill)
│   └── Artist Collaboration (Skill)
└── Fan Management (Plugin)
    ├── Audience Building (Skill)
    ├── Engagement Strategy (Skill)
    └── Community Building (Skill)
```

---

## KEY ASSUMPTIONS & CONSTRAINTS

### Assumptions

1. **Users have a DAW** (Logic Pro, Ableton, FL Studio, etc.) - Backstage is management layer, not production tool
2. **Most independent artists work with 2-8 collaborators** per project - system designed for this scale
3. **Legal/financial stakes are real** - users need audit trails and digital signatures
4. **Offline usage is occasional** - but needs graceful queuing when offline
5. **Users prefer agent-guided workflow** over full DIY spreadsheet management
6. **Stems are audio files**, not MIDI - system handles WAV/MP3, not instrument files

### MVP Constraints

1. **Single user = Main Artist** (future: multi-artist projects with different permissions)
2. **No external integrations yet** (Spotify, DistroKit, Mailchimp, etc.) - future phase
3. **No analytics dashboard** - tracking success/failure metrics deferred to Phase 2
4. **No collaboration on editing** (e.g., two people editing splits simultaneously) - locks or versions only
5. **Agent is Gemini-powered** (Claude/GPT available in future versions)
6. **No mobile app** (responsive web only for MVP)
7. **English-language only** for MVP
8. **No payment processing** (no revenue tracking, just split agreements)
9. **Max 20 collaborators per project** (hard limit to prevent chaos)
10. **Max 50 tracks per project** (rare, but prevents database bloat)

---

## RISKS & MITIGATION

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Agent generates irrelevant tasks | Users ignore/distrust agent | High | Heavy testing of task generation; user feedback loop; easy task deletion/disable |
| Offline sync causes data loss | Data integrity issues | Medium | Implement robust queue system; client-side validation; conflict resolution |
| Collaborators don't adopt (friction) | Collaboration adoption low | High | Minimal friction invite flow; clear notifications; one-click actions |
| Legal disputes over splits | Liability; loss of trust | Low but critical | Audit trails; digital signatures; legal disclaimer; consult lawyer on terms |
| Agent hallucination (suggests fake producers) | User frustration | Medium | Agent trained on real data; no AI-generated suggestions (yet); human review |
| Performance issues at scale | User churn | Medium | Load testing; pagination for large projects; lazy loading; CDN for stems |
| Users confused by agent behavior | Low adoption | Medium | Tooltips; transparency on WHY agent did something; explainability |
| Stem splitting fails frequently | Frustration; data loss | Medium | Error handling + retry; clear feedback; fallback to manual upload |

---

## CONSTRAINTS ON AGENT BEHAVIOR

### Guardrails for MVP

1. **No external API calls** (e.g., agent can't actually email producers, can only suggest)
2. **Task generation only** (agent doesn't edit project settings, only suggests)
3. **No financial transactions** (no payment processing, just split records)
4. **Context limited to project state** (agent doesn't access user's other projects or external data)
5. **Rate-limited** (e.g., max 1 agent action per user action, no spam)
6. **User override always available** (user can delete/disable any agent task)
7. **No hidden decisions** (all agent actions logged and visible)

---

## ANALYTICS & TRACKING

### Events to Track

**User Behavior:**
- Project created (project_type, timeline, budget)
- Track added (track_count per project)
- Track status changed (status_transition, timestamp)
- Collaborator invited (role, time_to_accept)
- Task completed (task_type, time_to_complete)
- Splits signed (num_signers, time_to_sign)
- Chat message sent (project_id, message_length)

**Agent Behavior:**
- Task generated (plugin_name, task_type, accepted/deleted ratio)
- Roadmap regenerated (reason, num_tasks_changed)
- Agent learning applied (pattern_detected, project_outcome)
- False positives (task_deleted_after_agent_created)

**Product Health:**
- Session duration (per project)
- Feature usage (% of users using each tab)
- Offline sync queue size (avg, max)
- Error rates (stem split failures, sync failures)
- Notification delivery (sent, clicked, muted)

### Success Metrics (Post-MVP)

- **Adoption:** % of created projects that reach "Ready for Release"
- **Engagement:** Avg sessions per user per week
- **Collaboration:** Avg collaborators per project
- **Agent Trust:** % of agent-generated tasks marked complete (vs. deleted)
- **Time Saved:** Self-reported hours saved on admin per user
- **Revenue Clarity:** 100% of multi-collab projects have signed splits

---

## GLOSSARY & TERMINOLOGY

| Term | Definition |
|---|---|
| **Agent** | AI-powered manager that automates task generation, sequencing, and notifications |
| **Plugin** | One of 8 manager duties (Creative Director, A&R, etc.) that agent can activate/deactivate |
| **Skill** | Specific task within a plugin (e.g., "Find Producer" under A&R plugin) |
| **Project** | Album, EP, Single, or Mixtape collection of tracks being produced |
| **Track** | Individual song within a project |
| **Bottleneck Track** | Track with status furthest from "Released" - determines project status |
| **Stem** | Individual audio file split from a track (drums, vocals, bass, etc.) |
| **Version** | Iteration of a track or stem (v1, v2, v3, etc.) |
| **Collaborator** | Team member invited to project (producer, engineer, artist, etc.) |
| **Split** | Revenue/credit percentage allocated to a collaborator for a track |
| **Roadmap** | Timeline of tasks generated by agent for project completion |
| **Dependency** | Task prerequisite (Task B depends on Task A) |
| **Soft Delete** | Archive item for 30 days before permanent deletion |
| **Audit Trail** | Complete log of all edits, splits, and signatures |
| **Main Artist** | Project creator with full control over project/splits |
| **@Here** | Notification tag alerting all collaborators |

---

## DEPENDENCIES & INTEGRATIONS

### Internal Dependencies

- **Auth Service:** User login, permissions, role management
- **File Service:** Stem upload/download, cover art storage
- **Notification Service:** Push/in-app/email notifications
- **LLM Service:** Gemini API for agent task generation

### External Integrations (Future)

- **Spotify API:** Playlist data, artist info, listener analytics
- **DistroKit/TuneCore:** Distribution and release management
- **Mailchimp/SendGrid:** Email campaigns and newsletters
- **Stripe:** Payment processing for splits (Phase 2)
- **DocuSign:** Digital signature service (currently in-app, upgrade later)
- **AWS S3:** Stem file storage
- **Slack:** Webhook notifications (Phase 2)

### Third-Party Services (MVP)

- **Gemini API:** LLM for agent
- **SendGrid/Mailchimp:** Email (basic transactional)
- **Twilio:** SMS notifications (optional)
- **Firebase:** Analytics & crash reporting

---

## SUPPORT & DOCUMENTATION PLAN

### In-App Help

- **Tooltips** on first interaction (can be disabled)
- **Contextual Help** per tab (click "?" in header)
- **Sample Project** walkthrough for onboarding
- **Agent Explainability** (why it created a task)

### External Documentation

- **Knowledge Base** (help.backstage.com)
  - Getting Started guide
  - Task management 101
  - Collaborator workflows
  - Splits & signatures explained
  - FAQ
  
- **Video Tutorials** (YouTube channel)
  - Project creation walkthrough
  - Inviting collaborators
  - Managing splits
  - Agent behavior explained
  
- **Email Support**
  - Response time: < 24 hours
  - Focus: Account issues, bugs, legal questions
  
- **Community Forum** (future)
  - User-to-user help
  - Best practices sharing

---

## FEATURE PRIORITIZATION (MOSCOW)

### MUST HAVE (MVP - Sprint 1-4)
- ✅ Create project (type, title, cover)
- ✅ Add/manage tracks with versioning
- ✅ Auto-generate roadmap based on project type
- ✅ Manual task management (CRUD)
- ✅ Invite collaborators
- ✅ Chat (project-level communication)
- ✅ Split management + digital signatures
- ✅ Agent task generation & reassignment
- ✅ Track status progression (Draft → Released)
- ✅ Offline support + queue

### SHOULD HAVE (Sprint 5-6)
- ✅ Stem splitting + versioning
- ✅ Track commenting with versioning
- ✅ Search/filter across tabs
- ✅ Undo functionality
- ✅ Soft deletes (30-day recovery)
- ✅ Per-collaborator notification muting

### COULD HAVE (Phase 2)
- Analytics dashboard (project success metrics)
- External integrations (Spotify, DistroKit)
- Bulk operations (invite multiple, mark multiple complete)
- Advanced permissions (role-based access control)
- Mobile app (native iOS/Android)
- Payment processing for splits
- Template projects (pre-made roadmaps)

### WON'T HAVE (Out of Scope)

- DAW integration (Backstage is not production tool)
- Real-time collaboration editing (async only for MVP)
- Mixing/mastering tools (reference only)
- Community/social features (not a social network)
- Artist discovery/matching (Phase 2+)
- Venue/booking integrations (Booking Agent plugin is task-based, not automated)

---

## POST-MVP ROADMAP

### Phase 2: Expansion (Q4 2026)

**Goals:** Add analytics, distribution, and secondary features

**Features:**
- Analytics Dashboard (streaming stats, split payouts)
- Distribution Integration (TuneCore, DistroKit, Stem)
- Advanced Permissions (role-based, per-collaborator settings)
- Payment Processing (actual split payouts)
- Bulk Operations (invite multiple, mark multiple complete)
- Archive & Export (full project export as ZIP)

### Phase 3: Ecosystem (Q1 2027+)

**Goals:** Build community and marketplace

**Features:**
- Artist directory (find collaborators by role/genre)
- Project templates (pre-made roadmaps for singles, albums, EPs)
- Collaborator marketplace (find producers, engineers, etc.)
- Revenue sharing (Backstage takes % of digital split transactions)
- Multi-artist projects (collabs, features, remixes)

### Phase 4: Intelligence (Q2 2027+)

**Goals:** Deepen AI capabilities

**Features:**
- Predictive analytics (when will this project be ready?)
- Success prediction (likelihood of playlist placement, streaming growth)
- A/B testing (which release strategy works best?)
- Automated pitching (agent pitches playlists on your behalf)
- Dynamic pricing (recommend prices for splits based on role scarcity)

---

## DEFINITION OF DONE

A feature is "done" when:

1. ✅ Acceptance criteria met (all scenarios passing)
2. ✅ Code reviewed and merged
3. ✅ QA tested on mobile + desktop
4. ✅ Offline scenario tested
5. ✅ Performance benchmarks met (load time < 2s, etc.)
6. ✅ Documentation updated (help.backstage.com)
7. ✅ Analytics events tracked
8. ✅ No console errors or warnings
9. ✅ Accessibility (a11y) tested
10. ✅ Product owner approval

---

## KNOWN LIMITATIONS & TECHNICAL DEBT

### MVP Limitations

1. **No real-time sync** (WebSocket for chat only, other data on refresh)
2. **No conflict resolution** (if 2 users edit simultaneously, last write wins)
3. **Stem splitting via AI** (no advanced audio processing, just file organization)
4. **Agent context limited** (sees project state only, not external data)
5. **Single-user Main Artist** (no true multi-user editing yet)
6. **No image compression** (covers upload as-is, may slow on mobile)

### Future Optimization

1. Implement Operational Transform (OT) for real-time collaboration
2. Add audio fingerprinting for duplicate stem detection
3. Expand agent context to user history + trends
4. Implement role-based access control (RBAC)
5. Add CDN for stem file delivery
6. Implement progressive image loading
7. Add caching layer (Redis) for frequently accessed projects

---

## SUCCESS CRITERIA (LAUNCH READINESS)

Before launching MVP to beta users:

- ✅ All 51 acceptance criteria scenarios passing
- ✅ Zero critical bugs (P0)
- ✅ < 3 high-severity bugs (P1)
- ✅ Mobile responsiveness tested (iOS Safari, Android Chrome)
- ✅ Offline queue handling tested
- ✅ Load testing at 100 concurrent users (no crashes)
- ✅ Agent task generation accuracy > 85% (relevant to project state)
- ✅ Onboarding tutorial completes in < 5 minutes
- ✅ First project creation < 3 minutes
- ✅ Signature collection success rate > 90%
- ✅ Legal review complete (splits, signatures, ToS)
- ✅ Security audit passed (data privacy, auth)
- ✅ Analytics instrumentation verified
- ✅ Support docs complete

---

## CONTACT & OWNERSHIP

**Product Manager:** [Your Name]  
**Engineering Lead:** [TBD]  
**Design Lead:** [TBD]  
**Agent/AI Lead:** [TBD]  

**Repository:** [GitHub URL - Private]  
**Project Tracker:** [Jira/Linear URL]  
**Documentation:** [Notion/Confluence URL]

---

## APPENDIX: COMPLETE ACCEPTANCE CRITERIA

*See detailed scenarios in main AC document (Journeys 1-10)*


2. [Journey 2: Track Management & Stem Lifecycle](#journey-2-track-management--stem-lifecycle)
3. [Journey 3: Agent-Driven Roadmap Management](#journey-3-agent-driven-roadmap-management)
4. [Journey 4: Collaboration & Team Communication](#journey-4-collaboration--team-communication)
5. [Journey 5: Revenue Management & Digital Signatures](#journey-5-revenue-management--digital-signatures)
6. [Journey 6: Track Status Progression & Agent Actions](#journey-6-track-status-progression--agent-actions)
7. [Journey 7: Agent Intelligence & Learning](#journey-7-agent-intelligence--learning)
8. [Journey 8: User Settings & Preferences](#journey-8-user-settings--preferences)
9. [Journey 9: Error Handling & Recovery](#journey-9-error-handling--recovery)
10. [Journey 10: End-to-End Project Completion](#journey-10-end-to-end-project-completion)
11. [Cross-Functional Requirements](#cross-functional-requirements)

---

## JOURNEY 1: PROJECT CREATION & INITIALIZATION

### SCENARIO 1.1: User Creates New Project

```gherkin
GIVEN a user is on the Projects tab (list view)
WHEN the user clicks "New Project"
THEN the NewProjectModal opens with:
  - Project title input (text field)
  - Project type dropdown (Album | Mixtape | EP | Single)
  - Cover art upload (image file)
  
WHEN the user fills in all fields and clicks "Create"
THEN:
  - New project is created with status "In Pre-Production"
  - User is automatically the Main Artist with full control
  - Empty tracks list initialized
  - Empty collaborators list (Main Artist only)
  - Empty SPLITS initialized
  - Empty CHAT initialized
  - Project timeline/budget/style fields appear for agent customization (Req #17, #18)
  
WHEN project is successfully created
THEN the user is redirected to the project detail page
AND CHAT auto-posts: "@Here Project '[ProjectName]' created as [ProjectType]. Initial setup complete."
```

### SCENARIO 1.2: Agent Auto-Generates Initial Roadmap Based on Project Type & User Preferences

```gherkin
GIVEN a new project has been created
AND user has provided timeline/budget/style preferences (Req #18)
WHEN project initialization completes
THEN the agent:
  - Analyzes project type (Album/EP/Single) + timeline + budget level (indie vs major artist) (Req #4, #18)
  - Generates an initial ROADMAP with tasks suited to the project type
  - Tasks are assigned to relevant roles (if no collaborators, marked "Unassigned")
  - Task due dates are staggered across the project timeline (Req #18)
  - CHAT auto-posts: "@Here Roadmap generated with [X] tasks. Timeline: [Date]. Review in ROADMAP tab."
  
WHEN user views ROADMAP tab
THEN:
  - All auto-generated tasks are visible with status, priority, assignee, due date
  - User can see task dependency chains (Req #24, #26)
  - User can disable auto-tasks entirely via project settings (Req #19)
  
WHEN user clicks "Settings" for the project
THEN a settings modal appears with:
  - Agent behavior: Aggressive | Moderate | Minimal (Req #17)
  - Project timeline: [Date range]
  - Project budget: Indie | Independent | Mid-level | Major (Req #18)
  - Genre/Style: [Text field] (Req #18)
  - Toggle: "Enable auto-task generation" (Req #19)
  
WHEN user adjusts settings and saves
THEN:
  - Agent regenerates roadmap based on new settings (Req #17, #18)
  - CHAT posts: "@Here Project settings updated. Roadmap adjusted."
```

### SCENARIO 1.3: User Can Request Agent to Regenerate Roadmap

```gherkin
GIVEN a user is viewing a project with an existing roadmap
WHEN the user clicks "Regenerate Roadmap" button (visible in ROADMAP tab or project settings)
THEN a confirmation dialog appears: "This will replace the entire roadmap. Continue?"
WHEN user confirms
THEN:
  - All existing tasks are archived (soft delete, Req #12)
  - Agent generates a fresh roadmap based on current project state
  - Agent applies learned behavior from previous projects (Req #32, #33)
  - CHAT posts: "@Here Roadmap regenerated. [X] new tasks created."
  - User can toggle "Enable auto-tasks" to disable this feature entirely (Req #19)
```

---

## JOURNEY 2: TRACK MANAGEMENT & STEM LIFECYCLE

### SCENARIO 2.1: User Manually Adds Tracks to Project

```gherkin
GIVEN a user is viewing a project's TRACKS tab
WHEN the user clicks "Add Track"
THEN a form/modal appears with:
  - Track title input (required)
  - BPM input (optional)
  - Key input (optional)
  - Duration input (optional)
  
WHEN user fills in and confirms
THEN a new track is created with:
  - Status: "Draft" (initial track status, Req #2)
  - One default "Original" version created
  - Empty stems list (linked to track, Req #3, #15)
  - Empty comments list
  - Empty splits list
  - Track added to TRACKS tab display
  
WHEN track is created
THEN CHAT auto-posts: "@Here Track '[TrackName]' added. Status: Draft."
```

### SCENARIO 2.2: User Updates Track Status (Triggering Agent Actions)

```gherkin
GIVEN a track exists in the TRACKS tab
WHEN user clicks on a track to view details
THEN a status dropdown appears showing:
  - Draft
  - Recording
  - Recorded
  - Mixing
  - Mixed
  - Mastering
  - Mastered
  - Released
  (Req #2)

WHEN user changes track status from "Draft" → "Recording"
THEN:
  - Track status is updated
  - Project status automatically updates based on track progression (Req #4)
  - Agent checks if relevant tasks exist in ROADMAP:
    - If status is "Recorded" → checks for "Arrange/Edit" task
    - If status is "Mixing" → checks for "Mixing Engineer" task; if none exists → creates "A&R - Find Mixing Engineer"
    - If status is "Mastering" → checks for "Mastering Engineer" task; if none exists → creates "A&R - Find Mastering Engineer"
  - CHAT auto-posts: "@Here '[TrackName]' status changed to [NewStatus]."
  (Req #3, #6)

WHEN all tracks reach "Mastered" status AND all splits are signed
THEN:
  - Project status automatically changes to "Ready for Release"
  - CHAT posts: "@Here All tracks mastered + splits signed. Project ready!"
  (Req #5)
```

### SCENARIO 2.3: User Creates Track Versions

```gherkin
GIVEN a track exists in TRACKS tab
WHEN user imports/records a new version of the track
THEN the system creates a new TrackVersion with:
  - Auto-incremented version ID (v-original, v2, v3, etc.)
  - Timestamp of creation (automatic, Req #49)
  - Track metadata: BPM, Key, duration
  - Links to all stems from previous version (or allows user to select which stems carry forward)
  
WHEN user views the track's "Versions" panel
THEN they see:
  - Current version (highlighted)
  - All previous versions with metadata
  - Ability to select and A/B compare any two versions (Space key to toggle, Req #2)
  - Ability to restore any previous version as current
  - Ability to rollback stems to a previous version (Req #48)
  
WHEN user performs A/B comparison
THEN:
  - Two versions play side-by-side or toggle with Space/T key
  - Waveforms visible for both versions
  - User can download both versions
```

### SCENARIO 2.4: User Invokes "Split Stems" (Agent Action)

```gherkin
GIVEN a track exists with audio content
WHEN user clicks track menu → "Split Stems"
THEN:
  - UI shows split progress bar (0-100%)
  - User sees: "Processing stems for '[TrackName]'..."
  
WHEN agent completes stem split
THEN:
  - Multiple stems are created and automatically linked to this track (Req #15, #16)
  - Stems created for typical components (drums, vocals, bass, instruments, etc.)
  - Each stem is associated with the current track version (Req #16)
  - User is notified: "Stems generated for '[TrackName]'. Check STEMS tab."
  - CHAT auto-posts: "@Here Stems generated for '[TrackName]'. [X] stems created."
  
IF stem split fails (Req #9)
THEN:
  - Error message displays: "[Error description]. [Retry] button available."
  - User can click "Retry" to attempt split again
```

### SCENARIO 2.5: User Manually Adds Stems to a Track

```gherkin
GIVEN a user is viewing the STEMS tab
WHEN the user clicks "Upload"
THEN a file upload dialog appears with:
  - File selector (audio files)
  - Track selector dropdown (which track to associate)
  
WHEN user selects file(s) and track, then clicks "Upload"
THEN:
  - Stems are created and linked to the selected track (Req #15)
  - Stems appear under folder: "[TrackName] - Stems"
  - Each stem auto-timestamps (Req #49)
  - Stems inherit the track's current version association (Req #16)
  - CHAT posts: "@Here Stems uploaded for '[TrackName]'."
```

### SCENARIO 2.6: Stems Are Never Orphaned; Track Deletion Prompts

```gherkin
GIVEN a track has stems linked to it
WHEN user clicks "Delete" on a track
THEN a confirmation dialog appears:
  - "Delete '[TrackName]'? It has [X] stems. Delete stems too?"
  - Options: [Delete Track + Stems] | [Delete Track Only, Archive Stems] | [Cancel]
  (Req #14)

WHEN user selects deletion option
THEN:
  - If "Delete + Stems" selected → Both track and stems are soft-deleted (Req #12)
  - If "Delete Track, Archive Stems" → Track soft-deleted, stems archived
  - Either way, stems are NEVER orphaned (Req #15)
  - Deleted items moved to "Trash" (soft delete, recoverable for 30 days, Req #12)
  - CHAT posts: "@Here '[TrackName]' deleted. Recoverable for 30 days."
```

### SCENARIO 2.7: User Can Undo Recent Action (Including Track Deletion)

```gherkin
GIVEN user just deleted a track or edited stems
WHEN they look at the top of the project OR click the "Undo" button
THEN the last action is recoverable (Req #11)
AND a notification shows: "Undo: [Action]? [Yes] [No]"
WHEN user clicks "Yes"
THEN the action is reversed and restored
AND CHAT posts: "[Action] undone by [User]."
```

### SCENARIO 2.8: Stems Have Version History & Can Be Rolled Back

```gherkin
GIVEN a stem file has been updated/re-uploaded multiple times
WHEN user views the STEMS tab
THEN each stem shows:
  - Current version (highlighted)
  - Version history button showing [X versions]
  
WHEN user clicks "History" on a stem
THEN a version panel opens showing:
  - All previous versions with timestamps (Req #49)
  - Ability to rollback to a previous version
  
WHEN user rolls back a stem to a previous version
THEN:
  - The stem reverts to that version
  - Since stems are tied 1:1 to track versions, the track version is also affected (Req #48)
  - User is prompted: "This will also update the linked track version. Continue?"
  - If confirmed: Both stem and track revert to that point in time
  - CHAT posts: "@Here Stem '[StemName]' rolled back to [Version] by [User]."
  - Audit log records the rollback
```

---

## JOURNEY 3: AGENT-DRIVEN ROADMAP MANAGEMENT

### SCENARIO 3.1: User Views Auto-Generated Roadmap with Dependencies

```gherkin
GIVEN a project has an auto-generated roadmap
WHEN user views the ROADMAP tab
THEN they see:
  - Progress bar: "[X]% Ready" (X of Y tasks completed) (Req #2)
  - All tasks listed with:
    - Title
    - Due date
    - Assigned collaborator
    - Priority (Low/Medium/High)
    - Status (Not Started/In Progress/Complete)
    - Dependency indicator (if task depends on another, Req #24, #26)
  
  - Visual representation of task dependencies (arrows or chain view, Req #26)
  - Filter options: By assignee, priority, status, dependency type (Req #43)
  
WHEN user hovers over a task with dependencies
THEN they see:
  - "Blocked by: [Task A]" (if this task can't start until Task A completes)
  - "Blocks: [Task B, Task C]" (if other tasks depend on this one)
  (Req #26)
```

### SCENARIO 3.2: User Cannot Complete Task Until Dependencies Are Met

```gherkin
GIVEN a task "Mastering" depends on task "Mixing" being complete
WHEN user tries to mark "Mastering" as complete (before "Mixing" is done)
THEN:
  - A warning appears: "Cannot complete. Prerequisite task incomplete: 'Mixing'"
  - Checkbox is disabled/greyed out (Req #25)
  
WHEN user completes "Mixing" first
THEN:
  - "Mastering" task is now available to complete
  - User is notified (in CHAT or notification): "Prerequisite complete. 'Mastering' ready to start."
```

### SCENARIO 3.3: User Manually Adds Task to Roadmap

```gherkin
GIVEN user is viewing ROADMAP tab
WHEN user clicks "Add Task"
THEN a form appears with:
  - Task title (required)
  - Due date picker
  - Priority: Low | Medium | High
  - Assignee: [Unassigned or collaborator dropdown]
  - Dependency: [Select another task as blocker] (Req #24)
  
WHEN user fills in and confirms
THEN:
  - New task appears in ROADMAP with status "Not Started"
  - If task has dependency, the dependency chain is visualized (Req #26)
  - If assigned to collaborator, CHAT posts: "@[Collaborator] Task assigned: '[TaskName]' - Due [Date]"
  - If unassigned, CHAT posts: "@Here New task: '[TaskName]' - Due [Date]"
```

### SCENARIO 3.4: User Completes Task & Agent Triggers Context-Aware Follow-up

```gherkin
GIVEN a task "Record Vocals" is marked as complete
WHEN user checks the task as "Complete"
THEN:
  - Task status changes to "Completed"
  - Agent processes task completion and checks project state (Req #3, #6):
    
    IF task is track-related (e.g., "Record Vocals" for Track X):
      - Update Track X status to "Recorded"
      - Agent checks: Is there a Mixing Engineer collaborator?
        - YES → Do NOT create "Find Mixing Engineer" task
        - NO → Create task "A&R - Find Mixing Engineer" with next in dependency chain
    
    IF user keeps deleting certain types of tasks (Req #32):
      - Agent learns this preference and doesn't suggest them in future projects (Req #33)
  
  - CHAT auto-posts: "@Here Task completed: '[TaskName]' by [User]"
  - All collaborators notified via @Here tag (can opt-out individually, Req #28, #29)
  - Audit log records task completion timestamp and who completed it
```

### SCENARIO 3.5: User Can Edit or Delete Tasks

```gherkin
GIVEN a task exists in ROADMAP
WHEN user clicks the task menu → "Edit"
THEN a form appears with:
  - Title
  - Due date
  - Priority
  - Assignee
  - Dependency selection
  (Req #24)

WHEN user makes changes and saves
THEN:
  - Task is updated
  - CHAT posts: "@Here '[TaskName]' updated by [User]"
  - If assignee changed, old and new assignees are notified

WHEN user clicks task menu → "Delete"
THEN a confirmation appears: "Delete '[TaskName]'?"
WHEN user confirms
THEN:
  - Task is soft-deleted (archived for 30 days, Req #12)
  - CHAT posts: "@Here '[TaskName]' deleted by [User]. Recoverable for 30 days."
  - Any dependent tasks are flagged with warning: "Prerequisite task deleted"
```

### SCENARIO 3.6: Agent Can Reassign Tasks Based on Collaborator Roles

```gherkin
GIVEN a roadmap has task "Mixing"
AND a collaborator "Sarah (Mixing Engineer)" is invited
WHEN agent processes the new collaborator
THEN:
  - Agent recognizes Sarah's role matches "Mixing" task
  - Agent auto-reassigns "Mixing" task from "Unassigned" to "Sarah"
  - CHAT posts: "@Sarah Task reassigned to you: 'Mixing' (due [Date])"
  (Req #6)

WHEN a collaborator is removed from project (Req #44, #45)
THEN:
  - Any tasks assigned to them are reassigned to "Unassigned"
  - CHAT posts: "@Here '[Collaborator]' removed. [X] tasks reassigned to Unassigned."
```

---

## JOURNEY 4: COLLABORATION & TEAM COMMUNICATION

### SCENARIO 4.1: User Invites Collaborators with Flexible Roles

```gherkin
GIVEN user is viewing COLLABORATORS tab
WHEN user clicks "Invite Member"
THEN an invite modal opens with:
  - Search input (to find users in system)
  - Role multi-select dropdown:
    - Graphic Designer
    - Producer
    - Mixing Engineer
    - Mastering Engineer
    - Session Musician
    - Vocalist
    - [Custom role input]
  (Note: One collaborator can have multiple roles, Req #7, no role-based permissions for MVP, Req #8)
  
WHEN user selects user(s) and role(s), clicks "Invite"
THEN:
  - Collaborator(s) added with status "Invited"
  - Bulk multi-select supported (Req #36)
  - CHAT posts: "@[Collaborator1] @[Collaborator2] Invited to project '[ProjectName]'"
  - Collaborators receive notification (push + in-app, Req #30)
  
WHEN collaborator accepts invite
THEN:
  - Status changes to "Active"
  - Agent checks if their role matches any pending tasks (Req #6)
  - Agent auto-reassigns relevant tasks to them if applicable
```

### SCENARIO 4.2: Agent Posts Messages & @Mentions Collaborators

```gherkin
GIVEN the agent takes any action (task created, roadmap updated, etc.)
WHEN the action is processed
THEN the agent auto-posts to CHAT with:
  - "@Here [Action description]" format
  - Sender labeled as "Manager (Agent)" or similar
  - Timestamp
  (Req #1, #2)

EXAMPLE: User marks "Record Vocals" complete
  → Agent checks project state
  → Creates follow-up task "A&R - Find Mixing Engineer"
  → Posts: "@Here New task created: 'A&R - Find Mixing Engineer' due [Date]. [TrackName] ready for mixing."
  
WHEN agent assigns task to specific collaborator
THEN it posts: "@[CollaboratorName] Task assigned: '[TaskName]' due [Date]"
```

### SCENARIO 4.3: Task Completion Auto-Posts to Chat with @Here Notification

```gherkin
GIVEN a collaborator completes a task in ROADMAP
WHEN they mark task as "Complete"
THEN:
  - CHAT auto-posts: "@Here Task completed: '[TaskName]' by [Collaborator]"
  - ALL collaborators receive notification (push + in-app) (Req #30)
  - Users can individually mute @Here notifications (Req #28, #29)
  - Users can set notification preferences: Tasks | Chat | Signatures (Req #28)
  - Digest option available: Real-time vs Daily summary (Req #31)
```

### SCENARIO 4.4: User Sends Direct Chat Messages & @Mentions

```gherkin
GIVEN a user is viewing the CHAT tab
WHEN user types a message
THEN:
  - If they type "@", a dropdown appears with all collaborators (Req #37)
  - User can @mention specific people or @Here for everyone
  
WHEN user sends message
THEN:
  - Message appears with timestamp and sender name
  - Mentioned collaborators receive direct notification
  - Message is stored in project history and searchable (Req #43)
```

### SCENARIO 4.5: User Can Mute Notifications Per Collaborator

```gherkin
GIVEN a user is receiving frequent notifications
WHEN they click Settings → Notifications
THEN they see:
  - Toggle for each notification type: Tasks | Chat | Signatures (Req #28)
  - Per-collaborator mute: (Mute notifications from [Collaborator]) (Req #29)
  - Notification delivery: Push | In-app (Req #30)
  - Digest option: Real-time | Daily Summary (Req #31)
  
WHEN user disables a notification type
THEN:
  - They no longer receive alerts for that type
  - But messages still post to CHAT (others see them, Req #28, #29)
```

### SCENARIO 4.6: Chat Message Deletion

```gherkin
GIVEN a user sent a message in CHAT
WHEN they click the message menu → "Delete"
THEN a confirmation appears: "Delete message?"
WHEN confirmed
THEN:
  - Message is hidden from view
  - Text replaced with "[deleted]" (Req #13)
  - Timestamp still visible
  - Other users see "[deleted]" instead of original message
```

---

## JOURNEY 5: REVENUE MANAGEMENT & DIGITAL SIGNATURES

### SCENARIO 5.1: Agent Auto-Populates Splits Based on Collaborator Roles

```gherkin
GIVEN a project has collaborators:
  - Main Artist (User)
  - Producer (John)
  - Mixing Engineer (Sarah)
  - Mastering Engineer (Mike)

WHEN the agent processes a track for splits
THEN agent auto-populates split percentages (Req #32):
  - Main Artist: 50%
  - Producer: 30%
  - Mixing Engineer: 15%
  - Mastering Engineer: 5%
  (Percentages based on role contribution, configurable per project type & budget)

WHEN split is generated
THEN CHAT posts: "@Here Revenue splits auto-generated for '[TrackName]'. Review in SPLITS tab."
AND Audit log records: "[Date] Agent auto-populated splits for [TrackName]" (Req #38)
```

### SCENARIO 5.2: Main Artist Reviews & Overrides Splits

```gherkin
GIVEN splits are auto-populated for a track
WHEN Main Artist views SPLITS tab
THEN they see:
  - Left column: Track selector (all tracks listed) (Req #1)
  - Right column: Selected track's split breakdown
  - Each collaborator shown with name, role, percentage
  - Visual progress bar for each collaborator's percentage
  
WHEN Main Artist adjusts a percentage
THEN:
  - Change is validated: Percentages must total exactly 100% (Req #32)
  - If validation fails: Error message "Total must equal 100%. Currently [X]%"
  - If valid: Split is updated
  - CHAT posts: "@Here [MainArtist] updated splits for '[TrackName]'"
  - Audit log records: "[Date/Time] [MainArtist] changed [Collaborator] from X% to Y%" (Req #38, #46)
  
ONLY Main Artist can override splits (full control, Req #6)
Collaborators can view but NOT edit (Req #7)
```

### SCENARIO 5.3: Audit Trail Tracks All Split Changes

```gherkin
GIVEN splits have been edited multiple times
WHEN Main Artist clicks "Audit History" button (in SPLITS tab)
THEN a log appears showing:
  - Timestamp of each change
  - Who made the change (agent or user name)
  - What changed (e.g., "Mixing Engineer: 15% → 20%")
  - Reason (if manually edited vs auto-populated)
  (Req #38, #46)

EXAMPLE LOG:
  [2026-06-07 14:23] Agent auto-populated splits
  [2026-06-07 15:00] MainArtist changed Producer: 30% → 35%
  [2026-06-07 15:05] MainArtist changed Mixing Engineer: 15% → 10%
```

### SCENARIO 5.4: Removing Collaborator Prompts Split Reassignment

```gherkin
GIVEN a track has splits, including "Producer (30%)"
WHEN user removes Producer from COLLABORATORS tab
THEN a prompt appears:
  - "[Producer] is assigned [X]% on [Y] tracks. Reassign their split?"
  - Options: [Reassign to another collaborator] | [Remove entirely] | [Cancel]
  (Req #44, #45)

WHEN user selects "Reassign to another collaborator"
THEN a dropdown appears with remaining collaborators
AND user selects who to reassign to
AND the percentage is transferred

WHEN reassignment completes
THEN:
  - Splits are updated
  - CHAT posts: "@Here [Producer] removed. Splits reassigned."
  - Audit log records: "[Date] [Producer] removed. [X]% reassigned to [NewCollaborator]" (Req #46)
```

### SCENARIO 5.5: Request Digital Signatures on Splits

```gherkin
GIVEN splits are finalized for a track(s)
WHEN Main Artist clicks "Request Signatures" (in SPLITS tab)
THEN:
  - A signature request is initiated
  - Agent posts to CHAT: 
    "@[Collaborator1] @[Collaborator2] Please review and sign the split agreement for '[TrackName]'. [Link to view splits]"
  - Signature request message includes deadline (e.g., "Due by [Date]")
  - Message appears in CHAT as interactive component with "Review Splits" button
  (Req #40, #2)

WHEN a collaborator clicks "Review Splits"
THEN they are taken to SPLITS tab with their splits highlighted
AND they see a "Sign Agreement" button

WHEN they click "Sign Agreement"
THEN:
  - Digital signature is captured (signature, timestamp, IP)
  - CHAT posts: "@Here [Collaborator] signed splits for '[TrackName]'"
  - Audit log records: "[Date/Time] [Collaborator] signed splits for [TrackName]"
  - Split record marked "Signed" with timestamp
```

### SCENARIO 5.6: View Signature Status

```gherkin
GIVEN a project has multiple signed/unsigned splits
WHEN Main Artist views SPLITS tab
THEN they see for each track:
  - "Last Signed: [Date]" or "Never"
  - Status indicator: 
    - Red "Pending signatures" (none signed)
    - Yellow "Partially signed" (some signed)
    - Green "All signed" (all collaborators signed)
  (Req #1, #5, #38)
```

### SCENARIO 5.7: Download All Splits (PDF)

```gherkin
GIVEN a project has splits configured for all tracks
WHEN Main Artist clicks "Download All Splits (PDF)"
THEN:
  - PDF is generated containing:
    - Project name, date generated
    - All tracks with their splits breakdown
    - Signed/unsigned status for each
    - Timestamp of generation
  - PDF is downloaded to user's device
  (Req #1)
```

---

## JOURNEY 6: TRACK STATUS PROGRESSION & AGENT ACTIONS

### SCENARIO 6.1: Track Status Progression Drives Project Status

```gherkin
GIVEN a project has 3 tracks: Track A, Track B, Track C (all Draft initially)

TRACK STATUS PROGRESSION (Req #2):
  Draft → Recording → Recorded → Mixing → Mixed → Mastering → Mastered → Released

PROJECT STATUS CALCULATION (Req #4, #5):
  Uses BOTTLENECK TRACK logic (focus on what's holding you back):
  
  STEP 1: Find the bottleneck track (furthest from Released)
    Track Status Priority (furthest → nearest Release):
    1. Draft (furthest)
    2. Recording
    3. Recorded
    4. Mixing
    5. Mixed
    6. Mastering
    7. Mastered
    8. Released (nearest)
  
  STEP 2: Map bottleneck track status to project status:
    - Bottleneck in Draft or Recording → Project = "In Pre-Production"
    - Bottleneck in Recorded or Mixing → Project = "In Production"
    - Bottleneck in Mixed or Mastering → Project = "In Post-Production"
  
  STEP 3: Special cases (override above):
    - If ALL tracks Mastered or Released AND all splits signed → Project = "Ready for Release"
    - If ALL tracks Released → Project = "Released"

EXAMPLE SCENARIOS:
  Tracks: Released, Mixing, Recording → Bottleneck: Recording → "In Pre-Production"
  Tracks: Mastered, Mastered, Mixed → Bottleneck: Mixed → "In Post-Production"
  Tracks: Mastered, Mastered, Mastered (splits signed) → "Ready for Release"
  Tracks: Released, Released, Released → "Released"

WHEN user changes Track A status to "Recording"
THEN Project status automatically updates
AND agent checks task dependencies (Req #24, #26)

WHEN user changes Track A status to "Recorded"
THEN:
  - Project status updates
  - Agent creates tasks for next phase (editing, arrangement)
  - CHAT posts: "@Here Track A status: Recorded. Next phase: Mixing."
```

### SCENARIO 6.2: Track Status Change Triggers Agent Follow-up Tasks

```gherkin
GIVEN Track A status is "Recording"
WHEN user changes Track A status to "Recorded"
THEN agent processes the status change:
  - Checks: Is there an Arrangement/Edit task in ROADMAP?
    - YES → Assign to appropriate collaborator or A&R
    - NO → Create task "Arrangement/Editing" for next phase
  
WHEN Track A status becomes "Mixing"
THEN agent checks:
  - Is there a Mixing Engineer collaborator?
    - YES → Do NOT create "Find Mixing Engineer" (role already filled)
    - NO → Create task "A&R - Find Mixing Engineer" with dependency on "Recording" phase completion
  
WHEN Track A status becomes "Mastering"
THEN agent checks:
  - Is there a Mastering Engineer collaborator?
    - YES → Do NOT create "Find Mastering Engineer"
    - NO → Create task "A&R - Find Mastering Engineer" with dependency on "Mixing" completion
  
CHAT posts for each status change: "@Here [TrackName] → [NewStatus]. [Context about next steps]"
(Req #3, #6)
```

---

## JOURNEY 7: AGENT INTELLIGENCE & LEARNING

### SCENARIO 7.1: Agent Learns from User Behavior Across Projects

```gherkin
GIVEN user has completed multiple projects
WHEN agent generates tasks for a new project
THEN agent applies learned patterns (Req #32, #33):
  
  IF user historically:
    - Deletes "Social Media Content Creation" tasks → Agent doesn't suggest them for new projects
    - Extends all due dates by 1 week → Agent adds buffer to new project timelines
    - Always assigns "Mixing" to a specific engineer → Agent pre-assigns that person in new projects
    - Prefers "Aggressive" task generation → Agent applies that preference to new projects
  
  THEN agent adapts task generation based on these learned behaviors (Req #33)

WHEN user clicks "Settings" → "Agent Preferences"
THEN they see:
  - Toggle: "Use learned preferences for new projects" (Req #33)
  - Button: "Reset Agent Learning" (clear all learned patterns, Req #34)
  
WHEN user clicks "Reset Agent Learning"
THEN all historical patterns are cleared
AND agent generates fresh roadmaps without learned bias for next project
```

---

## JOURNEY 7B: AGENT PLUGIN ADAPTATION BY PROJECT STATUS

Agent (Manager) plugins (duties) are **dynamic**—they activate/deactivate based on project status.

The 8 Manager Duties:
1. Creative Director — Shapes how you present yourself
2. Booking Agent — Gets you on stage
3. Opportunities Manager — Opens doors for your music
4. A&R — Finds the right people for your sound
5. Project Management — Keeps everything organized
6. Marketing Management — Plans how your music gets heard
7. Social Management — Helps you show up online with intention
8. Fan Management — Turns listeners into real fans

### SCENARIO 7B.1: Agent Plugin Activity by Project Status

```gherkin
PROJECT STATUS: "In Pre-Production"
BOTTLENECK: Track in Draft or Recording

ACTIVE PLUGINS:
  ✓ Creative Director (highest priority)
    - Suggests bio refinements based on track vibe
    - Recommends visual direction for upcoming release
    - Suggests merch/visual concepts tied to the sound
  
  ✓ A&R (highest priority)
    - Creates tasks: "Find Producer", "Find Session Musician", "Find Recording Studio"
    - Matches collaborators to track needs based on genre/style
    - Prioritizes finding recording/production resources
  
  ✓ Project Management (high priority)
    - Creates timeline tasks (when to record, arrange, etc.)
    - Sets up pre-production schedule
    - Allocates budget for recording/studio time
  
  ◐ Booking Agent (low priority)
    - May suggest early live rehearsal dates to test material
    - Not creating gig tasks yet (recording is the focus)
  
  ◑ Social Management (low priority)
    - Creates "behind-the-scenes content" task (studio recordings, writing process)
    - Not full social strategy yet
  
  ◐ Marketing Management (dormant)
    - Not active (nothing to market yet)
  
  ◐ Opportunities Manager (dormant)
    - Not active (track not ready for pitches/interviews)
  
  ◐ Fan Management (dormant)
    - Not active


PROJECT STATUS: "In Production"
BOTTLENECK: Track in Recorded or Mixing

ACTIVE PLUGINS:
  ✓ A&R (highest priority)
    - Creates tasks: "Find Mixing Engineer", "Find Mastering Engineer"
    - Prioritizes finding production specialists (mixing/mastering focus now)
  
  ✓ Project Management (high priority)
    - Updates timeline for mixing/mastering phases
    - Allocates budget for studio mixing time
    - Creates quality control checkpoints
  
  ✓ Creative Director (medium priority)
    - Suggests mix aesthetic (vibe, EQ direction, spatial choices)
    - May recommend reference tracks for mixing engineer
  
  ◐ Social Management (medium priority)
    - Creates "sneak preview" content tasks (30-second clips of mixing process)
    - Builds anticipation for upcoming release
  
  ◐ Booking Agent (low priority)
    - Suggests album release party/listening session planning
  
  ◑ Marketing Management (low priority)
    - Begins planning pre-release marketing timeline
    - Not executing yet (too early)
  
  ◑ Opportunities Manager (low priority)
    - Not active yet
  
  ◑ Fan Management (dormant)


PROJECT STATUS: "In Post-Production"
BOTTLENECK: Track in Mixed or Mastering

ACTIVE PLUGINS:
  ✓ A&R (high priority)
    - Confirms Mastering Engineer is on track
    - Creates quality assurance tasks (pre-master QC, post-master verification)
  
  ✓ Project Management (high priority)
    - Finalizes all deadlines (mastering completion, release date)
    - Creates artwork/metadata collection tasks
    - Prepares distribution checklist
  
  ✓ Marketing Management (high priority, activation begins)
    - Creates tasks: "Design release visuals", "Plan social media rollout"
    - Suggests playlist pitch targets
    - Creates press release draft task
  
  ✓ Social Management (high priority)
    - Creates content calendar for countdown to release
    - Suggests TikTok/Instagram Reel hooks
    - Coordinates with collaborators for promo posts
  
  ✓ Opportunities Manager (activating)
    - Creates task: "Pitch to playlists" (with curator targets)
    - Creates task: "Arrange interviews/features"
    - Creates task: "Identify sync opportunities"
  
  ◐ Creative Director (medium priority)
    - Reviews final master for creative intent
    - May suggest artwork themes
  
  ◐ Booking Agent (low priority)
    - Plans release event/listening party
  
  ◑ Fan Management (dormant)


PROJECT STATUS: "Ready for Release"
ALL TRACKS MASTERED + SPLITS SIGNED

ACTIVE PLUGINS:
  ✓ Marketing Management (highest priority)
    - Executes full release campaign
    - Pushes social content calendar
    - Coordinates playlist pitches
    - Manages paid promotional budget
  
  ✓ Social Management (highest priority)
    - Posts teasers, announcements, countdowns
    - Engages with comments/DMs
    - Coordinates influencer/collaborator posts
  
  ✓ Opportunities Manager (high priority)
    - Pitches playlist curators
    - Pitches to media/interview outlets
    - Identifies and pursues sync deals
  
  ✓ Booking Agent (high priority)
    - Creates tasks: "Book release show", "Arrange listening party"
    - Suggests tour dates (if album)
  
  ✓ Project Management (high priority)
    - Monitors distribution upload completion
    - Tracks metadata propagation across platforms
    - Sets up post-release success metrics
  
  ◐ Fan Management (activating)
    - Creates task: "Email fanbase about release"
    - Begins planning fan engagement strategy
  
  ◑ Creative Director (low priority)
    - Wraps up creative direction feedback
  
  ◑ A&R (dormant)


PROJECT STATUS: "Released"
ALL TRACKS LIVE ON PLATFORMS

ACTIVE PLUGINS:
  ✓ Marketing Management (high priority)
    - Continues promotional push (first 2 weeks critical)
    - Analyzes streaming data
    - Adjusts ad spend based on performance
  
  ✓ Social Management (high priority)
    - Maintains engagement with audience
    - Creates follow-up content (behind-the-scenes, reactions, etc.)
  
  ✓ Opportunities Manager (high priority)
    - Monitors playlist placements
    - Pursues interview/feature opportunities
    - Pitches sync opportunities
  
  ✓ Fan Management (high priority, now primary)
    - Creates tasks: "Engage with listeners on socials"
    - Builds mailing list
    - Plans fan exclusive content
    - Suggests community building activities
  
  ✓ Booking Agent (high priority)
    - Pushes live show bookings based on growing fanbase
    - Arranges tour dates (if momentum building)
  
  ◐ Project Management (medium priority)
    - Tracks analytics and KPIs
    - Archives project data
  
  ◑ Creative Director (low priority)
    - Provides feedback on performance
    - May begin planning next project
  
  ◑ A&R (dormant)
```

### SCENARIO 7B.2: Agent Task Generation Changes by Status

```gherkin
GIVEN a project transitions from "In Pre-Production" to "In Production"
WHEN the bottleneck track status changes from Recording → Recorded
THEN the agent:
  - DEACTIVATES Creative Director plugin (recording done, no more arrangement tweaks)
  - ACTIVATES Opportunities Manager plugin (preparing for future pitches)
  - INCREASES Project Management priority (mixing timeline now critical)
  - INCREASES A&R priority (finding mixing engineer is urgent)
  - Creates new tasks specific to mixing phase:
    - "A&R: Find Mixing Engineer"
    - "Mixing: Set up mixing session"
    - "Project: Define mix budget"
  - DELETES or ARCHIVES tasks related to recording phase:
    - "Recording: Complete vocal takes" (completed)
    - "A&R: Find Session Musician" (no longer needed if all recorded)
  
  CHAT posts: "@Here Project status: In Production. Focus now: Find Mixing Engineer. [X] new tasks created."
```

### SCENARIO 7B.3: Agent Suggests Relevant Manager Duties Based on Status

```gherkin
GIVEN user views ROADMAP in "In Post-Production"
WHEN agent has created marketing/social tasks
THEN user can see which plugin generated each task (optional feature):
  - Task: "Design release cover" → Plugin: Marketing Management
  - Task: "Create TikTok hook" → Plugin: Social Management
  - Task: "Pitch to playlists" → Plugin: Opportunities Manager
  - Task: "Finalize master" → Plugin: A&R / Project Management

WHEN user hovers over a task
THEN they can see: "This task was created by: [Plugin Name]. Why: [Context]"

EXAMPLE:
  Task: "Pitch to Spotify editorial"
  Plugin: Opportunities Manager
  Why: "Your track is mixed and ready. Pitching early maximizes placement odds."
  
This provides transparency into WHY the agent is suggesting things.
```

---

### SCENARIO 8.1: Notification Settings & Preferences

```gherkin
GIVEN a user is receiving notifications
WHEN they click their profile → "Settings" → "Notifications"
THEN they see:

NOTIFICATION TYPES (Req #28):
  ☑ Task-related (assignments, completions, updates)
  ☑ Chat messages (new messages, @mentions)
  ☑ Signature requests (split review needed)
  ☑ Stem processing (split/upload complete)
  (User can toggle each on/off)

DELIVERY METHOD (Req #30):
  ○ Push notifications (browser/mobile)
  ○ In-app notifications only

FREQUENCY (Req #31):
  ○ Real-time (as things happen)
  ○ Daily Digest (summary once per day, 9 AM)

PER-COLLABORATOR SETTINGS (Req #29):
  For each collaborator in projects: [Mute notifications from X]
  (User can mute specific people while still seeing their messages in CHAT)

WHEN user saves settings
THEN preferences are stored and applied immediately
```

### SCENARIO 8.2: Agent & Roadmap Preferences

```gherkin
GIVEN user is in project settings
WHEN they click "Agent & Roadmap"
THEN they see:

AGENT BEHAVIOR (Req #17):
  ○ Aggressive (many tasks, frequent follow-ups)
  ○ Moderate (balanced task generation)
  ○ Minimal (only critical path tasks)
  (Can change anytime; affects roadmap regeneration)

PROJECT PARAMETERS (Req #18):
  - Timeline: [Start date] to [End date]
  - Budget: Indie | Independent | Mid-level | Major
  - Genre/Style: [Text input, e.g., "Hip-Hop, introspective neo-soul"]
  (Agent uses these to contextualize task generation)

AUTO-TASKS (Req #19):
  ☑ Enable auto-task generation on status changes
  (If unchecked: Agent creates no tasks; user manages roadmap manually)

WHEN user saves changes
THEN agent recalculates roadmap based on new preferences (Req #17, #18, #19)
AND CHAT posts: "@Here Project settings updated. Roadmap adjusted."
```

---

## JOURNEY 9: ERROR HANDLING & RECOVERY

### SCENARIO 9.1: Stem Split Fails (Error Handling)

```gherkin
GIVEN user invokes "Split Stems" on a track
WHEN the stem splitting process fails (network error, file corruption, etc.)
THEN:
  - Progress bar stops
  - Error message displays: "[Error description]. Stem split failed."
  - "Retry" button appears
  
WHEN user clicks "Retry"
THEN:
  - Stem split process restarts
  - If it succeeds: Stems are created normally
  - If it fails again: Error persists with option to contact support
  (Req #9)
```

### SCENARIO 9.2: Action Queuing During Offline

```gherkin
GIVEN user is working on a project while offline (no internet connection)
WHEN they:
  - Mark a task as complete
  - Send a chat message
  - Update splits
  - Upload stems
THEN:
  - Actions are queued locally (Req #10)
  - UI shows "Syncing..." or similar indicator
  - Actions are temporarily stored in browser cache

WHEN internet connection is restored
THEN:
  - Queued actions are synced to server in order
  - CHAT posts: "[X] actions synced"
  - User sees confirmation: "Offline changes synced successfully"
  (Req #10)
```

### SCENARIO 9.3: Undo Last Action

```gherkin
GIVEN user just performed an action (deleted track, edited split, etc.)
WHEN they see the "Undo" prompt at top of page OR use keyboard shortcut (Ctrl+Z)
THEN the last action is reversed (Req #11):
  - Deleted track restored
  - Split change reverted
  - Chat message restored
  - Etc.

WHEN undo is triggered
THEN CHAT posts: "[User] undid [Action]"
```

### SCENARIO 9.4: Soft Deletes (Recoverable for 30 Days)

```gherkin
GIVEN user deletes a track, task, or comment
WHEN deletion completes
THEN the item is soft-deleted (archived, not removed) (Req #12):
  - Item hidden from main view
  - Item moved to project "Trash" (if visible)
  - Recoverable for 30 days

WHEN 30 days pass
THEN the item is permanently deleted (hard delete)

IF user deleted by mistake
WHEN they click "Undo" or go to Trash → "Restore"
THEN:
  - Item is restored to its original location
  - CHAT posts: "[Item] restored by [User]"
```

---

## JOURNEY 10: END-TO-END PROJECT COMPLETION

### SCENARIO 10.1: Complete Indie Single Release Workflow

```gherkin
GIVEN user is starting a new Single project
BACKGROUND:
  User: Independent artist (budget: "Indie")
  Timeline: 3 months to release
  Genre: Hip-Hop
  
STEP 1: PROJECT CREATION
  User creates "Single: 'Reflections'"
  Type: Single
  Agent generates roadmap:
    - 12 tasks total (Aggressive: Minimal)
    - Timeline: 3 months
    - Budget: Indie level
  CHAT: "@Here Single 'Reflections' created. [12] tasks generated."

STEP 2: TRACK CREATION & STATUS PROGRESSION
  User adds track "Reflections (Main)"
  Status: Draft
  Agent creates task: "Pre-Production: Arrange & Produce"
  
  User records the beat/vocals
  User changes status: Draft → Recording
  Project updates: "In Pre-Production"
  Agent creates task: "Recording: Complete all takes"
  
  Recording complete
  User changes status: Recording → Recorded
  Project updates: "In Production"
  Agent creates tasks:
    - "Arrangement/Editing: Finalize structure"
    - "A&R: Find Mixing Engineer" (if none available)
  CHAT: "@Here Reflections (Main) → Recorded. Ready for mixing."

STEP 3: COLLABORATOR INVITATION
  User invites:
    - Producer (John) - role: Producer
    - Sarah (Mixing Engineer) - role: Mixing Engineer
  CHAT: "@John @Sarah Invited to project 'Reflections'"
  Agent auto-assigns tasks to matching roles
  CHAT: "@Sarah Task assigned: Mixing - Due [Date]"

STEP 4: STEM SPLITTING
  User invokes "Split Stems" on "Reflections (Main)"
  Agent creates stems: drums, vocals, bass, instruments, etc.
  User can now manage individual stems in STEMS tab
  CHAT: "@Here Stems created for 'Reflections (Main)'. [6] stems available."

STEP 5: TRACK VERSION MANAGEMENT
  Sarah downloads stems, begins mixing
  Sarah creates version v2 of track with her mix
  User reviews v2 in A/B comparison vs original
  User approves v2 as current version
  User marks task "Mixing" as complete

STEP 6: AGENT FOLLOW-UP
  Agent processes "Mixing" task completion
  Agent checks: Is there a Mastering Engineer? (NO)
  Agent creates task: "A&R: Find Mastering Engineer"
  CHAT: "@Here Next step: Find Mastering Engineer for [TrackName]"

STEP 7: MASTERING ENGINEER ADDED
  User invites Mike (Mastering Engineer)
  CHAT: "@Mike Invited as Mastering Engineer"
  Agent auto-assigns "Mastering" task to Mike
  
  Mike completes mastering, creates version v3
  User marks task "Mastering" as complete
  User updates track status: Mixing → Mastered
  Project status updates: "Ready for Release" (if all tracks mastered)

STEP 8: REVENUE SPLITS
  Agent auto-populates splits:
    - You (Main Artist): 50%
    - John (Producer): 30%
    - Sarah (Mixing): 15%
    - Mike (Mastering): 5%
  CHAT: "@Here Splits auto-generated. Review in SPLITS tab."
  
  You review splits in SPLITS tab
  You adjust Producer: 30% → 35% (since John added production ideas)
  CHAT: "@Here You updated splits for 'Reflections (Main)'"
  Audit log records change

STEP 9: REQUEST SIGNATURES
  All splits finalized
  You click "Request Signatures"
  CHAT: "@John @Sarah @Mike Please review and sign splits for 'Reflections (Main)'. [Link]"
  Each collaborator signs
  CHAT: "@Here All parties signed 'Reflections (Main)' splits"

STEP 10: PROJECT COMPLETION
  All tracks: Mastered ✓
  All splits: Signed ✓
  Project status automatically: "Ready for Release" ✓
  CHAT: "@Here Project ready! All tasks complete. Roadmap at 100%."

  User reviews entire project:
    - TRACKS: 1 track, mastered
    - ROADMAP: 12 tasks, all complete
    - STEMS: 6 stems, final versions
    - COLLABORATORS: 3 team members
    - SPLITS: Signed by all
    - CHAT: Full communication history

STEP 11: OPTIONAL - ARCHIVE PROJECT
  Once music is released on platforms
  User can archive project (read-only)
  Data preserved for future reference
  Can unarchive if needed for remixes/re-release (Req #37)

STEP 12: EXPORT PROJECT DATA
  User can export full project as ZIP (Req #39):
    - All tracks and versions
    - All stems
    - Splits & signatures
    - Roadmap completed
    - Chat history
    - Metadata
  (For legal/archival purposes, per data retention policy, Req #39, #32)

```

---

## CROSS-FUNCTIONAL REQUIREMENTS

### RESPONSIVE DESIGN & MOBILE SUPPORT (Req #40, #41, #42)

```gherkin
GIVEN user accesses Backstage on mobile device (iPhone, Android)
WHEN they perform any action:
  - Creating projects
  - Adding tracks
  - Dragging/reordering (drag-and-drop)
  - Editing splits
  - Sending chat messages
  - Marking tasks complete
THEN all features work on mobile without degradation

MOBILE-SPECIFIC OPTIMIZATIONS:
  - Touch-friendly interactions for drag-and-drop (Req #41)
  - Smaller image sizes for stems/covers (Req #42)
  - Lazy loading of large lists (Req #42)
  - Responsive tabs (stacked on mobile, horizontal on desktop)
  - Readable font sizes (16px minimum for inputs)
  - Modal dialogs optimized for small screens
  
DRAG-AND-DROP ON MOBILE:
  - Long-press to initiate drag (Req #41)
  - Visual feedback while dragging
  - Drop zone highlighting
```

### SEARCH & FILTERING (Req #43)

```gherkin
ACROSS ALL TABS, USERS CAN SEARCH & FILTER:

ROADMAP TAB (Req #43):
  - Filter by assignee: [Dropdown with collaborators]
  - Filter by priority: Low | Medium | High
  - Filter by status: Not Started | In Progress | Complete
  - Filter by dependency type: [Blocker] | [Blocked By]
  - Search by task title: [Text input]

CHAT TAB (Req #43):
  - Search by keyword: [Text input]
  - Filter by collaborator: [Dropdown]
  - Filter by timestamp: [Date range picker]

TRACKS TAB (Req #43):
  - Search by track title: [Text input]
  - Filter by status: Draft | Recording | Recorded | Mixing | etc.
  - Filter by collaborator: [Dropdown]

COMMENTS (Req #43):
  - Search by text: [Text input]
  - Comments visible only on the version they were made (Req #20)
  - Cannot have replies/threads (no nested comments, Req #21)
  - Can @mention specific stems in comments (Req #22)
  - Can resolve/close comments (mark as addressed, Req #23)
```

### TRACK COMMENTS & VERSION-SPECIFIC FEEDBACK

```gherkin
GIVEN a track has multiple versions
WHEN user adds a comment on Track v1
THEN the comment is linked to Track v1 only (Req #20):
  - Comment is NOT visible on v2, v3, etc.
  - Comment shows: timestamp, version link, text

WHEN user switches to Track v2
THEN comments from v1 are hidden
THEN any comments made on v2 are shown

WHEN user views Track v1 again
THEN the previous comment reappears (Req #20)

COMMENTS FEATURES:
  - No replies/nested comments (flat comment list, Req #21)
  - Can @mention specific stems in comment text (Req #22)
    Example: "@drums stem has phase issues at 1:23"
  - Can mark comment as "Resolved" (Req #23)
    Example: User addresses feedback, marks as done
  - Resolved comments show [RESOLVED] badge
```

### ONBOARDING & SAMPLE PROJECT

```gherkin
GIVEN a brand new user opens Backstage for first time
WHEN they view the Projects tab
THEN they see:
  - "Welcome to Backstage!"
  - Option: "Take guided tour" OR "View sample project"
  
WHEN they click "View sample project"
THEN:
  - A read-only sample project "Sample: Neo-Soul Single" loads
  - User can explore all 6 tabs
  - Tooltips appear on first interaction with each feature (Req #51):
    - "This is the TRACKS tab. Add songs here."
    - "This is the ROADMAP. Agent creates tasks based on project needs."
    - "This is STEMS. Download individual audio elements."
    - Etc.
  
WHEN user clicks "Got it" on a tooltip
THEN it dismisses (Req #51)
AND preference is saved (don't show tooltips again unless user requests)

AFTER EXPLORING SAMPLE PROJECT:
  - User can create their own project
  - User can turn tooltips back on anytime (Settings → Tooltips)
```

### DATA RETENTION & COMPLIANCE

```gherkin
DATA RETENTION POLICY (Req #39, #32):
  - Active projects: Indefinite (user owns data)
  - Archived projects: 7 years (legal compliance for splits/signatures)
  - Soft-deleted items (Trash): 30 days (then hard deleted)
  - Chat history: Retained with project (can be exported, Req #39)
  - Signature records: 7 years (legal requirement)
  - Audit logs: 7 years (full edit history)

EXPORT FUNCTIONALITY (Req #39):
  User can export entire project as ZIP containing:
    - All tracks (multiple versions)
    - All stems
    - All metadata
    - Splits & signatures
    - Completed roadmap
    - Full chat history
    - Audit logs
  (For archival, legal, or migration purposes)
```

---

## TECHNICAL REQUIREMENTS (Non-Functional)

### Performance & Optimization

```gherkin
- Page load time: < 2 seconds (Req #42)
- Drag-and-drop responsiveness: < 100ms feedback (Req #41)
- Chat message send: < 1 second (Req #30)
- Offline queue: Supports up to 100 queued actions (Req #10)
- Soft delete recovery: Items recoverable within 30 days (Req #12)
```

### Data Integrity

```gherkin
- Splits validation: Always sum to 100% (Req #32)
- Track status progression: Only allow forward status changes (or undo, Req #11)
- Task dependencies: Cannot complete blocked tasks (Req #25)
- Audit trail: All changes logged with timestamp & user (Req #38, #46)
- Orphaned stems: NEVER allowed (Req #15)
```

---

## SUMMARY: 51 REQUIREMENTS MAPPED

| # | Requirement | Journey(s) | Status |
|---|---|---|---|
| 1 | User can ask agent to "Regenerate Roadmap" | 1 | ✓ |
| 2 | Individual track status progression | 6 | ✓ |
| 3 | Track status triggers agent actions | 6 | ✓ |
| 4 | Project status vs track status relationship | 6 | ✓ |
| 5 | Project "Ready" = all tracks mastered + splits signed | 6 | ✓ |
| 6 | Main Artist: Full control | 3, 5 | ✓ |
| 7 | Collaborators: Comment, mark tasks, no edit splits/invite | 4 | ✓ |
| 8 | Basic role system (no granular permissions MVP) | 4 | ✓ |
| 9 | Failed actions show error + retry | 9 | ✓ |
| 10 | Offline support: Queue actions, sync when reconnected | 9 | ✓ |
| 11 | Undo last action | 9 | ✓ |
| 12 | Soft deletes (archive for 30 days) | 2, 9 | ✓ |
| 13 | Chat message deletion marked "[deleted]" | 4 | ✓ |
| 14 | Deleting track prompts "Delete stems too?" | 2 | ✓ |
| 15 | Stems are never orphaned | 2 | ✓ |
| 16 | Stems tied to track version | 2 | ✓ |
| 17 | Project settings: Agent behavior (aggressive/moderate/minimal) | 1, 8 | ✓ |
| 18 | User inputs timeline, budget, style → agent adapts | 1, 8 | ✓ |
| 19 | Ability to disable auto-tasks | 1, 8 | ✓ |
| 20 | Comments visible only on version made | 2 | ✓ |
| 21 | No comment replies | 2 | ✓ |
| 22 | @mention specific stems in comments | 2 | ✓ |
| 23 | Can resolve/close comments | 2 | ✓ |
| 24 | Define task dependencies (Task B depends on Task A) | 3 | ✓ |
| 25 | Can't mark Task B complete until Task A done | 3 | ✓ |
| 26 | ROADMAP shows dependency chains | 3 | ✓ |
| 27 | Agent uses dependencies to sequence follow-up tasks | 3, 7 | ✓ |
| 28 | User settings: Notify me on [Tasks, Chat, Signatures] | 8 | ✓ |
| 29 | Per-collaborator mute | 8 | ✓ |
| 30 | Notification delivery: Push, In-app | 8 | ✓ |
| 31 | Digest option (daily summary vs real-time) | 8 | ✓ |
| 32 | Agent tracks user patterns (e.g., deleted tasks) | 7, 8 | ✓ |
| 33 | Agent adapts for next project | 7 | ✓ |
| 34 | User can reset agent learning | 7 | ✓ |
| 35 | Bulk mark tasks complete | 3 | ✓ |
| 36 | Invite collaborators: multi-select | 4 | ✓ |
| 37 | Archive completed projects (read-only, with restore option) | 10 | ✓ |
| 38 | Export full project data (ZIP) | 10 | ✓ |
| 39 | Data retention policy (7 years for signatures/audit) | 10 | ✓ |
| 40 | All features responsive | 11 | ✓ |
| 41 | Touch-friendly drag-and-drop | 11 | ✓ |
| 42 | Mobile-specific optimizations (lazy load, small images) | 11 | ✓ |
| 43 | Search/Filter across tabs (roadmap, chat, tracks, comments) | 11 | ✓ |
| 44 | Removing collaborator prompts: "Reassign split percentage?" | 5 | ✓ |
| 45 | Can reassign % to another collaborator or remove entirely | 5 | ✓ |
| 46 | Audit logs removal + reassignment | 5 | ✓ |
| 47 | Stems have version history | 2 | ✓ |
| 48 | Can rollback stem to previous version (also rolls back track) | 2 | ✓ |
| 49 | Versioning automatic (time-stamped) | 2 | ✓ |
| 50 | Onboarding walkthrough of "Sample Project" | 11 | ✓ |
| 51 | Tooltips explaining agent actions (can be turned off) | 11 | ✓ |

---

## END OF ACCEPTANCE CRITERIA

**Next Steps:**
1. Share this doc with development team
2. Break down by sprint (1 journey per sprint or smaller)
3. Create test cases for each scenario
4. Assign story points and dependencies
5. Begin MVP development with Journey 1 (Project Creation)
