# Pricing Strategy — AI Music Management App

**Version:** 1.0
**Date:** June 7, 2026
**Stage:** Pre-Launch

---

## 1. Pricing Philosophy

Independent artists are price-sensitive but not price-resistant — they pay for tools that demonstrably save them time or money. The pricing strategy is built on three principles:

1. **Free tier removes the barrier to entry.** Artists try before they pay. The free tier is real enough to show value, limited enough to create a reason to upgrade.
2. **Paid tiers are priced against the alternative cost.** A human manager charges 15–20% of earnings. An attorney charges $200–500/hour for split agreements. This product replaces both for $12–29/month.
3. **Price increases are easier than price decreases.** Launch at the floor. Raise prices once retention data proves willingness to pay.

---

## 2. Pricing Tiers

### Free — $0/month

**Target:** Solo artist testing the product. Top of funnel.

| Feature | Limit |
|---|---|
| Active projects | 1 |
| Tracks per project | 5 |
| Collaborators per project | 2 |
| AI agent roadmap generation | 1 per project (no regeneration) |
| Agent plugins active | Project Management only |
| Stems | Manual upload, 500MB total storage |
| Revenue splits | View only (cannot request signatures) |
| Chat | Included |
| PDF export | No |
| Offline support | No |
| Support | Community only |

**Freemium gate:** The moment an artist wants to invite a third collaborator or create a second project, they hit the wall. This is the natural conversion trigger — it happens at the exact moment the product has proven value.

---

### Artist — $12/month ($115/year — save 20%)

**Target:** Active independent artist releasing music regularly.

| Feature | Limit |
|---|---|
| Active projects | Unlimited |
| Tracks per project | 50 |
| Collaborators per project | 10 |
| AI agent roadmap generation | Unlimited (including regeneration) |
| Agent plugins active | All 8 plugins |
| Agent learning | Enabled (learns from behavior across projects) |
| Stems | Manual upload, 10GB storage |
| Revenue splits | Full — auto-populate, edit, request signatures, PDF export |
| Chat | Included |
| Offline support | Included |
| Support | Email (response < 48 hours) |

**Why $12:**
- Below the psychological $15 threshold for B2C subscriptions
- Comparable to Splice ($7.99–$14.99), Logic Pro subscription ($4.99), and other music tools artists already pay for
- $144/year — less than one hour of attorney time for a split agreement

---

### Team — $29/month ($278/year — save 20%)

**Target:** Small indie label, music collective, or manager running multiple artists.

| Feature | Limit |
|---|---|
| Active projects | Unlimited |
| Tracks per project | 50 |
| Collaborators per project | 20 |
| AI agent roadmap generation | Unlimited |
| Agent plugins active | All 8 plugins |
| Agent learning | Enabled, cross-project patterns |
| Stems | Manual upload, 50GB storage |
| Revenue splits | Full + bulk signature requests across projects |
| Team dashboard | View all projects across roster in one view |
| Priority task assignment | Assign tasks across multiple projects simultaneously |
| Chat | Included |
| Offline support | Included |
| Support | Priority email (response < 24 hours) |
| Billing | Single invoice for all projects |

**Why $29:**
- 2.4× the Artist plan for significantly more capacity
- Positioned against Asana Starter ($10.99/user/month × 5 users = $55/month) — Team plan is cheaper and music-native
- Small labels managing 3–5 artists currently spend $200–500/month on project management tools cobbled together

---

## 3. Pricing Comparison vs. Alternatives

| Tool | Price | Music-Native | AI Agent | Splits |
|---|---|---|---|---|
| **This Product (Artist)** | **$12/mo** | **✅** | **✅** | **✅** |
| Asana Starter | $10.99/user/mo | ❌ | ❌ | ❌ |
| Monday Basic | $9/user/mo (min 3) | ❌ | ❌ | ❌ |
| Trello Standard | $5/user/mo | ❌ | ❌ | ❌ |
| Pibox | $15/mo | ✅ | ❌ | ❌ |
| Splice | $7.99–$14.99/mo | ✅ | ❌ | ❌ |
| Human manager | 15–20% of earnings | ✅ | N/A | ✅ |
| Attorney (splits) | $200–500/hour | N/A | N/A | ✅ |

**The $12 Artist plan replaces the split-agreement function of an attorney and the coordination function of a manager at a fraction of the cost. That is the value framing for every conversation with a potential user.**

---

## 4. Annual Plan Discount

| Plan | Monthly | Annual | Savings | Effective Monthly |
|---|---|---|---|---|
| Artist | $12 | $115 | $29 (20%) | $9.58 |
| Team | $29 | $278 | $70 (20%) | $23.17 |

**Push annual hard from day one.** Annual plans reduce churn, improve cash flow, and increase LTV. Target: 40% of paying users on annual plans by end of Year 1.

---

## 5. Freemium Gate Design

The free tier must be generous enough to show real product value but limited in the exact features that matter most when projects get serious.

**Primary gate: Collaborator limit (2 on Free, 10 on Artist)**

This is the right gate because:
- A solo artist with no collaborators gets full value from Free — no reason to upgrade yet
- The moment they add a producer, engineer, or any second collaborator, they're doing a real project
- The third collaborator is the natural "this is real now" moment — that's when they'll pay

**Secondary gate: Project limit (1 on Free)**

After finishing one project, the artist has seen the full workflow. If they want to start a second, they've validated the product for themselves. Upgrade ask at this moment converts well.

**What is NOT gated:**
- Chat (realtime communication is a collaboration hook — don't block it)
- Track status progression (core workflow — must work on Free)
- Agent roadmap generation (one time — let them see the magic before gating)

---

## 6. Pricing for Collaborators

**Collaborators do not pay.** They are invited by the main artist (who pays) and get full access to the project they're invited to.

This is intentional:
- Reduces friction for the main artist to invite their team
- The paying user (main artist) gets more value the more collaborators they have
- Collaborators experience the product, become users themselves, and start their own projects — converting to paying Artist plan users organically

**This is the viral loop:** Main artist pays → invites 4 collaborators → collaborators experience the product → collaborators start their own projects → 4 new Artist plan subscribers.

---

## 7. Phase 2 Revenue Streams

### Split Transaction Fee — 5% of processed payments

When split payment processing goes live (Phase 2, Stripe integration):
- Main artist initiates a split payout through the platform
- Platform takes 5% of the total processed amount
- Collaborators receive their percentage minus the 5% fee

**Positioning:** "We only make money when you get paid." Aligns incentives with the user.

**Example:** $10,000 track advance split among 4 collaborators → $500 platform fee → $9,500 distributed

### Distribution Integration Fee — $9.99 per release

When distribution integrations go live (TuneCore, DistroKid API):
- Artist submits release directly from the platform
- $9.99 flat fee per release (platform fee, not distribution fee — distribution fees are separate and pass-through)
- Convenience fee for not leaving the app to distribute

### Collaborator Marketplace Commission — 10–15% of booked fees

When the marketplace launches (Phase 3):
- Producers, mix engineers, mastering engineers list services with rates
- Artists book directly through the platform
- Platform takes 10–15% of the booking fee

---

## 8. What NOT to Do at Launch

| Temptation | Why to Resist |
|---|---|
| Launch with a per-seat pricing model | Too complex for solo artists; kills the viral collaborator loop |
| Charge collaborators | Kills adoption; the main artist pays for the team |
| Price above $15/mo at launch | No brand recognition yet; need to win trust first |
| Offer a lifetime deal | Attracts bargain hunters, not loyal recurring users; destroys LTV |
| Add too many tiers (4+) | Decision fatigue; 3 tiers (Free, Artist, Team) is the ceiling |
| Discount to close early users | Sets wrong price anchor; offer annual discount instead |

---

## 9. Price Increase Roadmap

| Stage | Price | Trigger |
|---|---|---|
| Launch (beta) | $12 Artist / $29 Team | MVP live |
| Year 1 (post-traction) | $15 Artist / $35 Team | 500+ paying users, strong retention data |
| Year 2 (post-seed) | $18 Artist / $45 Team | Phase 2 features live (split payments, distribution) |
| Year 3 (marketplace) | $22 Artist / $59 Team | Full marketplace + analytics live |

**Grandfather existing users at their rate for 12 months** when raising prices. This is standard SaaS practice and prevents churn spikes at price increase announcements.

---

## 10. Pricing Validation Plan

Before locking in launch pricing, validate with the beta cohort:

| Question | Method |
|---|---|
| Would you pay $12/month for this? | Direct interview question with 10 beta users |
| At what price would this feel too expensive? | Van Westendorp price sensitivity survey |
| At what price would you question the quality? | Van Westendorp price sensitivity survey |
| Would you pay annually for a 20% discount? | Direct question in onboarding flow |
| Which feature would you most pay to unlock? | Card sort exercise with 5 beta users |

**Rule:** If fewer than 7 of 10 interviewed artists say yes to $12/month, drop to $9 for launch and retest at 3 months.

---

*Supporting documents: `business-plan.md` · `financial-model.md`*
