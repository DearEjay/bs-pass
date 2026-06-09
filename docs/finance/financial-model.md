# Financial Model — AI Music Management App

**Version:** 1.0
**Date:** June 7, 2026
**Currency:** USD
**Basis:** Bottom-up from unit economics; conservative assumptions

---

## 1. Key Assumptions

| Assumption | Value | Basis |
|---|---|---|
| Launch date | Q4 2026 | TECHPLAN MVP timeline |
| Primary market | US independent artists | English-only MVP |
| Free-to-paid conversion rate | 8% | Conservative for B2C SaaS (industry avg 2–5%; music community = higher intent) |
| Monthly churn rate | 5% | Early-stage SaaS benchmark; improves as product matures |
| Artist plan price | $12/mo | Competitive with music SaaS tools |
| Team plan price | $29/mo | Small label / collective tier |
| Plan mix | 80% Artist / 20% Team | Most users are solo artists |
| Blended ARPU | $15.40/mo | (0.80 × $12) + (0.20 × $29) |
| CAC (community + content) | $32 avg | Weighted avg across channels |
| Gross margin | 85% | Infrastructure cost advantage (see operating_costs.md) |
| Pre-seed raise | $250,000 | SAFE at $2.5M cap |
| Pre-seed close | Month 1 | |

---

## 2. Revenue Model

### 2.1 Subscriber Growth

| Month | Free Users | New Paid | Churned | Total Paid | MRR |
|---|---|---|---|---|---|
| 1 | 50 | 4 | 0 | 4 | $62 |
| 2 | 120 | 10 | 0 | 14 | $216 |
| 3 | 220 | 18 | 1 | 31 | $477 |
| 4 | 350 | 28 | 2 | 57 | $878 |
| 5 | 500 | 40 | 3 | 94 | $1,448 |
| 6 | 680 | 54 | 5 | 143 | $2,202 |
| 7 | 900 | 72 | 7 | 208 | $3,203 |
| 8 | 1,150 | 92 | 10 | 290 | $4,466 |
| 9 | 1,430 | 114 | 15 | 389 | $5,991 |
| 10 | 1,750 | 140 | 19 | 510 | $7,854 |
| 11 | 2,100 | 168 | 26 | 652 | $10,041 |
| 12 | 2,500 | 200 | 33 | 819 | $12,613 |

**Year 1 closing:** ~820 paid users · **$12,613 MRR · ~$100K ARR**

> Note: Free tier is the primary acquisition channel. Conversion to paid happens when user invites a second collaborator or creates a second project (freemium gate).

---

## 3. Three-Year P&L Summary

### Year 1 (Months 1–12)

| Line Item | Amount |
|---|---|
| **Revenue** | |
| Subscription revenue | $72,000 |
| Transaction fees (Phase 2 — not live) | $0 |
| **Total Revenue** | **$72,000** |
| **Cost of Revenue** | |
| Infrastructure (Supabase, Vercel, Gemini, SendGrid) | $3,600 |
| Payment processing (Stripe on subscriptions) | $2,160 |
| **Gross Profit** | **$66,240 (92% GM)** |
| **Operating Expenses** | |
| Engineering (contract — MVP build, 10 weeks) | $75,000 |
| Engineering (ongoing maintenance, part-time) | $24,000 |
| Marketing & community | $18,000 |
| Legal & compliance | $15,000 |
| Tools & software | $3,600 |
| Founder salary (deferred — pre-revenue) | $0 |
| **Total OpEx** | **$135,600** |
| **Net Loss** | **($69,360)** |
| **Monthly burn (avg)** | **$13,800** |
| **Runway on $250K raise** | **18 months** |

---

### Year 2 (Months 13–24)

| Line Item | Amount |
|---|---|
| **Revenue** | |
| Subscription revenue | $420,000 |
| Transaction fees on splits (5% of processed) | $42,000 |
| Distribution integration fees | $42,000 |
| **Total Revenue** | **$504,000** |
| **Cost of Revenue** | |
| Infrastructure | $18,000 |
| Payment processing | $15,120 |
| Stripe split processing fees | $8,400 |
| **Gross Profit** | **$462,480 (92% GM)** |
| **Operating Expenses** | |
| Engineering (1 FTE) | $130,000 |
| Marketing & growth | $72,000 |
| Community manager (part-time) | $18,000 |
| Legal & compliance | $12,000 |
| Tools & software | $8,400 |
| Founder salary | $72,000 |
| **Total OpEx** | **$312,400** |
| **Net Income / (Loss)** | **$150,080** |
| **Monthly burn → profit at Month ~22** | |

---

### Year 3 (Months 25–36)

| Line Item | Amount |
|---|---|
| **Revenue** | |
| Subscription revenue | $1,320,000 |
| Transaction fees on splits | $180,000 |
| Distribution fees | $132,000 |
| Collaborator marketplace (10% take rate) | $100,000 |
| **Total Revenue** | **$1,732,000** |
| **Cost of Revenue** | |
| Infrastructure | $48,000 |
| Payment processing | $39,600 |
| Marketplace processing | $10,000 |
| **Gross Profit** | **$1,634,400 (94% GM)** |
| **Operating Expenses** | |
| Engineering (2 FTE) | $280,000 |
| Head of Growth | $100,000 |
| Marketing & paid acquisition | $180,000 |
| Community & support | $60,000 |
| Legal & compliance | $18,000 |
| Tools & software | $24,000 |
| Founder salary | $120,000 |
| **Total OpEx** | **$782,000** |
| **Net Income** | **$852,400** |

---

## 4. User Growth Summary

| Period | Free Users | Paid Users | MRR | ARR |
|---|---|---|---|---|
| End of Month 6 | 680 | 143 | $2,202 | $26K |
| End of Year 1 | 2,500 | 820 | $12,613 | $151K |
| End of Year 2 | 12,000 | 3,500 | $42,000 | $504K |
| End of Year 3 | 35,000 | 12,000 | $144,300 | $1.73M |

---

## 5. Burn Rate & Runway

| Scenario | Monthly Burn | Runway on $250K |
|---|---|---|
| Best case (founder does all engineering) | $6,900 | 36 months |
| Base case (contract engineer) | $13,800 | 18 months |
| Worst case (2 contractors + marketing spend) | $22,000 | 11 months |

**Base case is the plan.** Contract engineer for 10-week MVP build, then part-time maintenance. Full-time hire at Month 10 once seed round closes.

**Seed round trigger:** $500K ARR or 3,500 paying users — whichever comes first.

---

## 6. Break-Even Analysis

| Metric | Value |
|---|---|
| Fixed monthly costs (base case, post-MVP) | $11,200 |
| Blended ARPU | $15.40 |
| Gross margin | 85% |
| Contribution margin per user | $13.09 |
| Break-even paid users | 856 |
| Break-even MRR | $13,181 |
| Projected break-even month | Month 22 |

---

## 7. CAC & LTV by Channel

| Channel | CAC | Monthly Churn | LTV | LTV:CAC |
|---|---|---|---|---|
| Houston community outreach | $8 | 4% | $308 | 38:1 |
| Content marketing (YouTube/TikTok) | $22 | 5% | $246 | 11:1 |
| Reddit / Discord organic | $15 | 5% | $246 | 16:1 |
| Paid social (Meta) | $48 | 6% | $205 | 4:1 |
| Affiliate / referral | $28 | 4% | $308 | 11:1 |
| **Blended average** | **$32** | **5%** | **$246** | **7.7:1** |

**LTV formula:** ARPU × Gross Margin ÷ Monthly Churn Rate
= $15.40 × 0.85 ÷ 0.05 = **$261**

---

## 8. Sensitivity Analysis

### What if churn is higher than expected?

| Monthly Churn | LTV | Break-Even Users | Break-Even Month |
|---|---|---|---|
| 3% (great retention) | $437 | 856 | Month 19 |
| 5% (base case) | $261 | 856 | Month 22 |
| 8% (poor retention) | $164 | 856 | Month 28 |
| 12% (churn crisis) | $109 | 856 | Never without intervention |

**If churn exceeds 8%, the product has a retention problem, not a marketing problem.** That is the signal to focus on product improvements before spending more on acquisition.

### What if conversion rate is lower than expected?

| Free-to-Paid Conversion | Year 1 Paid Users | Year 1 ARR |
|---|---|---|
| 12% (strong) | 1,230 | $151K |
| 8% (base case) | 820 | $101K |
| 5% (weak) | 513 | $63K |
| 3% (poor) | 308 | $38K |

**At 3% conversion, the freemium gate needs redesign.** The trigger point (second collaborator or second project) should be tested in the first 90 days of beta.

---

## 9. Funding Milestones

| Milestone | Target | Trigger for Next Round |
|---|---|---|
| Pre-seed close | $250K SAFE | Founder commits to building |
| Beta launch | 100 active users | Product validated |
| Seed round | $1–1.5M | 3,500 paid users / $500K ARR |
| Series A | $5–8M | $2M ARR / clear path to $10M ARR |

---

## 10. Revenue Expansion Path

**Year 1:** Subscriptions only. Establish product-market fit.

**Year 2:** Add transaction fees on split payments (5% via Stripe). Add distribution integration fees ($9.99/release). These are high-margin revenue streams that require zero additional CAC — they monetize existing active users.

**Year 3:** Collaborator marketplace. Artists post needs (find a mix engineer, find a producer). Collaborators bid. Platform takes 10–15%. This is the high-ceiling revenue stream that justifies a Series A.

**Long-term:** At scale, the marketplace take rate becomes the dominant revenue stream. Subscriptions become the acquisition and retention mechanism, not the primary revenue driver — similar to how Fiverr and Upwork evolved.

---

*Supporting documents: `business-plan.md` · `operating_costs.md` · `TECHPLAN.md`*
