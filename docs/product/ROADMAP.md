# 90-Day Sprints — AI Music Management App

**Version:** 1.0
**Date:** June 7, 2026
**Goal:** First paying customer within 90 days

---

## Overview

Three 30-day sprints. Each sprint has one primary objective, weekly tasks, and a clear pass/fail milestone. If a milestone is missed, diagnose before moving forward — do not just push the milestone to the next sprint.

---

## Sprint 1 — Validate (Days 1–30)

**Objective:** Prove the problem is real and people will pay before writing a single line of code.

**Pass/Fail Milestone:** 10 artist interviews completed. At least 7 of 10 describe the same core pain (project coordination chaos, split disputes, or time lost on admin). At least 3 express willingness to pay $12/month.

---

### Week 1 — Talk to People

- [ ] Write a list of 20 independent artists you can contact this week — Houston first
  - Think: artists you know personally, producers in your network, anyone who releases music independently
- [ ] Draft a 5-question interview script:
  1. Walk me through how you managed your last project from start to release.
  2. What was the most frustrating part of coordinating your team?
  3. Have you ever had a dispute over revenue splits or credits?
  4. How much time per week do you spend on project admin vs. actually making music?
  5. If a tool handled all of that coordination for you, what would you pay per month?
- [ ] Schedule and complete 5 interviews this week (in-person or 20-min Zoom)
- [ ] Record or take detailed notes on every interview — verbatim quotes are gold
- [ ] Join 2 Houston music communities online (Facebook groups, Discord, Reddit)

### Week 2 — Complete Interviews + Analyze

- [ ] Complete remaining 5 interviews (total: 10 by end of Week 2)
- [ ] Synthesize findings:
  - What exact phrases do artists use to describe the pain?
  - What is the single most painful moment in their workflow?
  - What tools are they using today and why do those fall short?
- [ ] Write a 1-page Problem Summary — use their exact words, not your interpretation
- [ ] Decision point: Do 7 of 10 confirm the problem? If yes → continue. If no → run 5 more interviews before proceeding.

### Week 3 — Build the Waitlist

- [ ] Register your business name and domain this week
- [ ] Set up a simple landing page (Carrd, Framer, or Webflow — no code needed yet):
  - Headline: use the exact pain language from your interviews
  - 3-sentence description of what the product does
  - Email capture: "Join the waitlist — free for first 100 artists"
  - No screenshots needed — concept description is enough
- [ ] Share landing page with all 10 interviewed artists — ask them to share
- [ ] Post in Houston music communities with context (not a sales pitch — "building this, want feedback")
- [ ] Goal: 50 waitlist signups by end of Week 3

### Week 4 — Incorporate + First Advisor

- [ ] Incorporate Delaware C-Corp via Clerky ($500–800)
- [ ] Obtain EIN from IRS (free, 10 minutes at irs.gov)
- [ ] Open Mercury business bank account (free)
- [ ] Execute Founder Stock Purchase Agreement
- [ ] **File 83(b) election with IRS — do not skip, do not delay**
- [ ] Execute IP Assignment Agreement
- [ ] Identify one music industry advisor from your network — offer 0.25% equity vesting over 2 years
- [ ] Register Texas foreign corporation ($750)

**Sprint 1 Milestone Check:**
- [ ] 10 interviews done
- [ ] 7+ confirm core pain
- [ ] 3+ express willingness to pay $12/month
- [ ] 50 waitlist signups
- [ ] Company incorporated
- [ ] 83(b) filed

---

## Sprint 2 — Build (Days 31–60)

**Objective:** Ship a working MVP to beta users and get the first paying customer.

**Pass/Fail Milestone:** MVP deployed. 20 beta users actively using it. 1 paying customer.

---

### Week 5 — Hire Engineer + Start Build

- [ ] Post contract engineer role (Toptal, Gun.io, or personal network)
  - Spec: Next.js + Supabase + TypeScript, 10-week engagement, $60–80K
  - Share TECHPLAN.md as the technical brief — this is your hiring filter
- [ ] Interview 3 candidates minimum
- [ ] Execute Contractor Agreement before any work begins (IP assignment clause included)
- [ ] Engineer starts: Supabase setup, schema migrations, auth flow, project CRUD (Sprint 1 of TECHPLAN)
- [ ] Draft Terms of Service and Privacy Policy (use attorney or Termly for first draft)

### Week 6 — Build Continues + Beta List Prep

- [ ] Engineer: Track CRUD, project status calculation, basic chat (TECHPLAN Phase 1)
- [ ] Send personal email to all 50 waitlist signups:
  - "Building now. Beta in 3 weeks. You're on the list."
  - Ask: "What's the #1 thing you'd use this for first week?"
- [ ] Collect responses — use to prioritize what to demo first
- [ ] Finalize Terms of Service and Privacy Policy — get legal review
- [ ] Set up PostHog analytics account
- [ ] Set up Sentry error monitoring account

### Week 7 — Build Continues + Pre-Launch

- [ ] Engineer: Agent roadmap generation, task CRUD, roadmap tab (TECHPLAN Phase 2)
- [ ] Deploy to Vercel staging environment
- [ ] Internal testing: create a project, add tracks, generate a roadmap — does it feel right?
- [ ] Update landing page: "Beta launching next week — limited spots"
- [ ] Personal outreach to top 20 waitlist names — invite them specifically by name
- [ ] Set up SendGrid for transactional email

### Week 8 — Beta Launch

- [ ] ToS and Privacy Policy live on site
- [ ] Deploy MVP to production (Vercel + Supabase)
- [ ] Send beta launch email to full waitlist (50 people)
- [ ] Onboard first 20 beta users personally — be available on chat/DM for questions
- [ ] Watch PostHog: where do users drop off? What do they click first?
- [ ] Fix the top 3 bugs that appear in first 48 hours
- [ ] Ask every beta user after Day 3: "Did you create a project? What stopped you if not?"
- [ ] **Ask one beta user to pay $12 this week** — the first paying customer moment matters psychologically

**Sprint 2 Milestone Check:**
- [ ] MVP deployed and stable
- [ ] 20 active beta users
- [ ] 1 paying customer
- [ ] ToS + Privacy Policy live
- [ ] PostHog tracking confirmed (events firing)

---

## Sprint 3 — Grow (Days 61–90)

**Objective:** Get to 10 paying customers. Begin investor conversations. Establish repeatable acquisition channel.

**Pass/Fail Milestone:** 10 paying customers. 1 investor meeting booked. One acquisition channel identified with measurable CAC.

---

### Week 9 — Retention First

- [ ] Call or DM every one of your 20 beta users — 1:1 conversations
  - What did you actually use?
  - What did you skip?
  - Would you pay $12/month? If not, why not?
- [ ] Fix the top 5 product issues surfaced in conversations — retention before acquisition
- [ ] Identify your 3 most engaged beta users — these are your champions
- [ ] Ask champions: "Would you share this with 2 artists you know?"
- [ ] Set up referral tracking (PostHog or simple UTM links)

### Week 10 — Convert Beta to Paid

- [ ] Email all 20 beta users: "Beta is ending. Locking in $9/month for life if you upgrade this week."
  - This is a one-time founder's pricing offer — not your standard price
  - Goal: 5 paying users from beta cohort
- [ ] For users who don't convert: ask why in a 5-minute call — their reason is your next product fix
- [ ] Open platform to public waitlist — send launch email to remaining 30
- [ ] Target: 10 total paying users by end of week

### Week 11 — Content + Community

- [ ] Record a 3-minute demo video showing: create project → agent generates roadmap → invite collaborator → splits signed
  - Post to YouTube, TikTok, Instagram Reels
  - Title: "I replaced my music manager with AI — here's how"
- [ ] Post in r/WeAreTheMusicMakers and r/makinghiphop — genuine community post, not an ad
- [ ] Attend one Houston music event this week — bring business cards, have the conversation in person
- [ ] Contact 2 Houston recording studios about a partnership: "Refer artists, get 3 free months for your clients"
- [ ] Set up affiliate tracking for studio partners

### Week 12 — Investor Prep + Close Sprint

- [ ] Polish pitch-deck.md into a real slide deck (Pitch.com or Google Slides)
- [ ] Research 10 target investors from `funding-request.md` investor list
- [ ] Send 5 warm intro requests through your network — not cold emails
- [ ] Book at least 1 investor meeting (coffee, Zoom — doesn't matter)
- [ ] Write a public "we launched" post on LinkedIn — your story, the problem, what you built
- [ ] Update all documents with real numbers: actual user count, actual MRR, actual CAC

**Sprint 3 Milestone Check:**
- [ ] 10 paying customers
- [ ] MRR: $120+ (10 × $12)
- [ ] 1 investor meeting booked
- [ ] 1 repeatable acquisition channel identified (community, content, or referral)
- [ ] Churn rate measured (how many of your first 20 beta users are still active?)

---

## 90-Day Summary

| Sprint | Days | Primary Goal | Hard Milestone |
|---|---|---|---|
| 1 — Validate | 1–30 | Prove the problem | 10 interviews, 7 confirm pain, company incorporated |
| 2 — Build | 31–60 | Ship the product | MVP live, 20 beta users, 1 paying customer |
| 3 — Grow | 61–90 | First revenue | 10 paying customers, 1 investor meeting |

---

## If You Hit These Numbers at Day 90

| Metric | Day 90 Target | What It Means |
|---|---|---|
| Paying customers | 10 | Problem validated, product works |
| MRR | $120 | Real revenue, not free users |
| Beta user retention | 60%+ still active | Product has stickiness |
| Interview-to-paid conversion | 30%+ | Strong product-market fit signal |
| Investor meetings booked | 1+ | Fundraising is possible |

**If you hit all 5:** Start the pre-seed raise immediately. You have a story.
**If you hit 3 of 5:** Identify which 2 you missed and why before raising.
**If you hit fewer than 3:** Go back to user interviews. The product or the problem framing needs work before fundraising.

---

## Non-Negotiable Rules for All 3 Sprints

1. **Talk to a user every single week** — never go 7 days without a real conversation with an artist
2. **Ship something every week** — even a bug fix counts; momentum is psychological
3. **Measure everything** — if PostHog isn't showing an event for it, it didn't happen
4. **Do not raise money before Sprint 3 milestone** — investors fund traction; 10 customers is the minimum credible story
5. **Do not build features not on the TECHPLAN** — scope creep at this stage kills startups
6. **Do not hire before you need to** — the contract engineer is the only hire in 90 days

---

*Supporting documents: `business-plan.md` · `TECHPLAN.md` · `pricing-strategy.md` · `funding-request.md`*
