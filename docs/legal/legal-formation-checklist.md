# Legal Formation Checklist — AI Music Management App

**Version:** 1.0
**Date:** June 7, 2026
**Location:** Houston, TX (incorporated in Delaware)
**Status:** Pre-incorporation

> **Disclaimer:** This document is a planning checklist, not legal advice. Hire a startup attorney or use Clerky/Stripe Atlas for document preparation. Estimated cost to complete all steps: $3,000–$8,000.

---

## Phase 1 — Incorporate (Do This First, Before Anything Else)

### Step 1: Choose Your Formation Method

| Option | Cost | Speed | Best For |
|---|---|---|---|
| **Clerky** | $500–$800 | 1–2 days | Solo founders; clean, investor-ready docs |
| **Stripe Atlas** | $500 | 1–2 days | Simple setup; good if using Stripe for payments |
| **Startup attorney** | $2,000–$5,000 | 3–7 days | Complex structures; co-founders; recommended if raising immediately |

**Recommendation:** Clerky for speed and cost. Switch to a startup attorney before the seed round closes.

**Houston startup attorneys to consider:**
- Winstead PC (Houston) — startup practice
- Foley & Lardner (Houston) — tech startups
- Wilson Sonsini (remote, standard for startups)
- Gunderson Dettmer (remote, standard for startups)

---

### Step 2: Incorporate as a Delaware C-Corp

- [ ] Choose company legal name (check Delaware name availability)
- [ ] Choose registered agent in Delaware (~$50–150/year; Clerky/Atlas includes this)
- [ ] File Certificate of Incorporation with Delaware Secretary of State
- [ ] Pay Delaware filing fee (~$89 standard, ~$250 expedited)
- [ ] Receive Certificate of Incorporation (keep this permanently)
- [ ] Obtain Federal EIN (Employer Identification Number) from IRS — free at irs.gov, takes 10 minutes

**Why Delaware C-Corp (not Texas LLC):**
- Standard structure expected by every VC and angel investor
- SAFEs, option pools, and preferred stock are all designed for C-Corps
- Delaware courts are well-established for corporate law
- Texas LLC cannot issue stock options; harder to raise institutional capital

---

### Step 3: Initial Corporate Setup

- [ ] Adopt Bylaws (standard; comes with Clerky/Atlas package)
- [ ] Appoint initial Board of Directors (you, as sole founder)
- [ ] Hold organizational board meeting (written consent is fine)
- [ ] Issue founder shares (see Step 4)
- [ ] Open a business bank account (Mercury or Brex — both free, startup-friendly)
- [ ] Register to do business in Texas as a foreign corporation (~$750 filing fee with Texas Secretary of State) — required to operate in TX as a DE corp

---

## Phase 2 — Protect the Founder (Do Within 30 Days of Incorporation)

### Step 4: Issue Founder Stock

- [ ] Execute Founder Stock Purchase Agreement
  - 9,000,000 shares at $0.0001/share ($900 total — buy your own shares)
  - 4-year vesting schedule, 1-year cliff
  - Single-trigger acceleration on acquisition
- [ ] Board approves stock issuance via written consent
- [ ] Founder pays $900 to the company for shares (must be a real transaction)

### Step 5: File 83(b) Election ⚠️ CRITICAL — 30-DAY DEADLINE

- [ ] Complete IRS 83(b) election form
- [ ] **Mail to IRS within 30 days of stock grant date** — this deadline is hard; missing it cannot be undone
- [ ] Send via certified mail, return receipt requested (keep proof of mailing permanently)
- [ ] Keep a copy of the filed election in company records

**What happens if you miss the 30-day window:**
Without an 83(b) election, you pay ordinary income tax on the fair market value of shares as they vest each month — potentially hundreds of thousands of dollars in tax on paper gains before you've made a dollar. File it. Do not miss this.

**83(b) election resources:**
- IRS form: search "83b election template" — standard 1-page document
- Clerky generates this automatically as part of founder stock issuance
- Mail to your IRS service center (for Texas residents: Austin, TX IRS center)

---

### Step 6: IP Assignment Agreement

- [ ] Execute Intellectual Property Assignment Agreement
  - Assigns all IP created before and after incorporation to the company
  - Covers: codebase, TECHPLAN, product spec, business plan, domain names, brand assets
  - Standard clause: "all work product created in connection with the company's business"
- [ ] This is non-negotiable for any investor — they will ask for it at due diligence

---

## Phase 3 — Protect the Business (Before Any User Touches the Product)

### Step 7: Terms of Service

- [ ] Draft Terms of Service covering:
  - User accounts and eligibility (must be 18+)
  - Acceptable use policy
  - Intellectual property (user content remains theirs; platform gets license to display)
  - Revenue splits disclaimer: platform-generated splits are not legally binding contracts; users are responsible for their own agreements
  - Digital signature disclaimer: token-based signatures are an audit trail, not certified e-signatures
  - Limitation of liability
  - Dispute resolution (arbitration clause — standard for SaaS)
  - Governing law: Delaware
- [ ] Legal review before publish (~$500–1,500 with attorney)
- [ ] Live on website before first user signs up

### Step 8: Privacy Policy

- [ ] Draft Privacy Policy covering:
  - What data is collected (email, name, audio files, IP addresses for signatures)
  - How data is used
  - Third-party services (Supabase, SendGrid, PostHog, Sentry, Gemini API)
  - Data retention and deletion
  - User rights (access, export, deletion)
  - Cookie policy
  - CCPA compliance (California users — required even if you're in Texas)
  - Contact information for privacy requests
- [ ] Legal review before publish
- [ ] Live on website before first user signs up

### Step 9: Contractor Agreement

- [ ] Draft standard Contractor / Independent Contractor Agreement for:
  - Contract engineer (MVP build)
  - Any designer, marketer, or other freelancer
- [ ] Must include:
  - Scope of work
  - Payment terms
  - **IP assignment clause** — all work product belongs to the company
  - Confidentiality / NDA clause
  - Independent contractor status (not employee — no benefits, no payroll tax)
  - Termination clause
- [ ] Execute before any contractor starts work — never pay someone without a signed agreement

### Step 10: NDA Template

- [ ] Draft standard mutual NDA for:
  - Investor conversations
  - Advisor conversations
  - Partnership discussions
  - Vendor negotiations
- [ ] Keep signed NDAs on file
- [ ] Note: most VCs will not sign NDAs at early stage; angels and advisors generally will

---

## Phase 4 — Raise Capital (Before Closing Any Investment)

### Step 11: SAFE Agreement

- [ ] Use Y Combinator Post-Money SAFE (free download at ycombinator.com)
- [ ] Customize with:
  - Valuation cap: $2,500,000
  - Discount rate: None
  - Pro-rata side letter (separate document granting investors right to participate in Seed)
- [ ] Board consent authorizing SAFE issuance
- [ ] Execute one SAFE per investor
- [ ] File SAFEs in company records
- [ ] Update cap table to reflect outstanding SAFEs

### Step 12: State Securities Exemption (Texas Blue Sky)

- [ ] Confirm SAFE issuance qualifies under federal Regulation D, Rule 506(b) exemption
  - Max 35 non-accredited investors; unlimited accredited investors
  - No general solicitation (no posting on social media offering investment)
- [ ] File Form D with SEC within 15 days of first SAFE closing (free, electronic filing at sec.gov)
- [ ] File Texas State Notice with Texas State Securities Board if required
  - Texas generally follows federal exemptions but check with attorney
- [ ] **Only raise from accredited investors at pre-seed** to keep compliance simple
  - Accredited investor = $200K+ annual income or $1M+ net worth excluding primary residence

---

## Phase 5 — Protect the Brand (As Soon As You Have a Name)

### Step 13: Domain & Social

- [ ] Register primary domain (e.g., musicapp.com or [brandname].com)
- [ ] Register variations (.io, .co, common misspellings)
- [ ] Secure social handles: Twitter/X, Instagram, TikTok, YouTube, LinkedIn — even if not active yet

### Step 14: Trademark (Optional at Pre-Seed, Recommended at Seed)

- [ ] Search USPTO database for conflicts before committing to a brand name
- [ ] File trademark application for company name + logo with USPTO
  - Cost: $250–$350 per class (file under Class 42 — software services)
  - Timeline: 8–12 months to registration
  - Can file "intent to use" before product is live
- [ ] Note: Trademark is not required to operate but protects brand at scale

---

## Phase 6 — Ongoing Compliance

### Annual Requirements (Delaware C-Corp)

- [ ] Pay Delaware franchise tax annually (due March 1)
  - Minimum: $400/year using Assumed Par Value method
  - Can be much higher using Authorized Shares method — use the correct calculation method
- [ ] File annual report with Delaware Secretary of State ($50)
- [ ] File annual report with Texas Secretary of State (~$300) as foreign corporation
- [ ] Maintain registered agent in Delaware (annual fee)
- [ ] Hold annual board meeting (written consent acceptable for single founder)
- [ ] Keep corporate records up to date: cap table, board consents, stock ledger

### Tax Requirements

- [ ] File federal corporate tax return (Form 1120) annually
- [ ] File Texas franchise tax return (due May 15)
- [ ] Issue 1099s to any contractor paid $600+ in a calendar year (due January 31)
- [ ] Consider S-Corp election if and when founder salary exceeds $50K (reduces self-employment tax — consult CPA)

---

## Document Checklist Summary

| Document | When | Status |
|---|---|---|
| Certificate of Incorporation | Day 1 | ☐ |
| Bylaws | Day 1 | ☐ |
| EIN from IRS | Day 1 | ☐ |
| Business bank account | Day 1–3 | ☐ |
| Texas foreign corporation registration | Week 1 | ☐ |
| Founder Stock Purchase Agreement | Week 1 | ☐ |
| **83(b) Election (IRS)** | **Within 30 days — NO EXCEPTIONS** | ☐ |
| IP Assignment Agreement | Week 1 | ☐ |
| Terms of Service | Before beta launch | ☐ |
| Privacy Policy | Before beta launch | ☐ |
| Contractor Agreement (template) | Before first hire | ☐ |
| NDA (template) | Before investor conversations | ☐ |
| SAFE Agreement | Before first investment closes | ☐ |
| Form D (SEC) | Within 15 days of first SAFE | ☐ |
| Domain registration | This week | ☐ |
| USPTO trademark search | Before committing to brand name | ☐ |

---

## Estimated Costs

| Item | Cost |
|---|---|
| Delaware incorporation (Clerky) | $500–$800 |
| Texas foreign corporation registration | $750 |
| Registered agent (annual) | $50–$150/year |
| Business bank account | $0 (Mercury) |
| Legal review: ToS + Privacy Policy | $500–$1,500 |
| Contractor agreement template | $300–$500 |
| SAFE legal review | $500–$1,000 |
| Form D filing | $0 |
| Domain names | $50–$200 |
| USPTO trademark (optional at pre-seed) | $250–$350 |
| **Total (without trademark)** | **$2,650–$4,900** |
| **Total (with trademark)** | **$2,900–$5,250** |

*Budget $5,000–$8,000 for legal at pre-seed to cover overages and attorney consultations.*

---

*Supporting documents: `funding-request.md` · `business-plan.md`*
