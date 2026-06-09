# Operating Costs — AI Music Management App

---

## Launch / Beta (0–100 users)

**~$0/month**

Everything fits inside free tiers:

| Service | Free Limit | You'll Use |
|---|---|---|
| Vercel | 100GB bandwidth | Well under |
| Supabase | 500MB DB, 1GB storage, 2M Edge Function calls | Under |
| Gemini 1.5 Flash | $0 to start | ~$0.05/month at low volume |
| SendGrid | 100 emails/day | Sufficient |
| PostHog | 1M events/month | Well under |
| Sentry | 5K errors/month | Well under |
| Upstash Redis | 10K requests/day | Under |

---

## Early Traction (100–500 users)

**~$25–50/month**

| Service | Cost | Trigger |
|---|---|---|
| Supabase Pro | $25/mo | Storage fills up fast — audio files are large |
| Gemini API | ~$2–5/mo | ~500 roadmap generations/month |
| SendGrid Essentials | $0–20/mo | Only if exceeding 100 emails/day |
| Everything else | $0 | Still within free tiers |

---

## Growing (500–2,000 users)

**~$150–350/month**

| Service | Cost | Notes |
|---|---|---|
| Supabase Pro + storage overages | $25 + ~$50–100/mo | **Dominant cost.** WAV stems at 50–500MB each add up fast. 1,000 users × 10 stems × 100MB avg = ~1TB = ~$190/mo in storage alone |
| Gemini API | $15–40/mo | ~2,000+ roadmap generations + event processing |
| SendGrid | $20–90/mo | Invite emails, signature requests, digests |
| Vercel Pro | $20/mo | Bandwidth/function limits hit around here |
| Sentry Team | $26/mo | Worth it once users are paying |
| PostHog | $0–25/mo | Depends on event volume |

---

## Watch Out For

**Audio storage is the cost that will surprise you.** Everything else — compute, AI, email — is cheap. A single user with 2 projects, 10 tracks each, 5 WAV stems per track at 200MB avg = 10GB per user. At 500 users that's 5TB. Supabase charges $0.021/GB after the included 100GB — roughly $100/month in storage overages alone at that scale.

**Two decisions to make before launch:**

1. **Set file size caps aggressively** — the TECHPLAN allows 500MB per stem. Consider whether WAV is necessary or whether compressed formats (FLAC, high-quality MP3) are acceptable for storage purposes.
2. **Supabase storage scales linearly** — at high volume, direct S3 is cheaper than Supabase Storage (which sits on S3 with a markup). Worth revisiting at the 500+ user mark.
