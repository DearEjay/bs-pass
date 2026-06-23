import { requireAuth } from '../_shared/auth.ts'
import { CORS } from '../_shared/cors.ts'
import { makeLlmRatelimiter } from '../_shared/ratelimit.ts'
import { generateContent, GROQ_FAST, GROQ_SMART } from '../_shared/gemini.ts'


interface BudgetGenRequest {
  totalAmount: number
  currency: string
  focusAreas: string[]
  projectType?: string
  goals?: string
}

interface LineItemSuggestion {
  category: string
  label: string
  budgeted: number
  notes: string
  sort_order: number
}

// Builds a sensible default allocation when AI fails
function buildFallback(totalAmount: number, focusAreas: string[]): { lineItems: LineItemSuggestion[]; aiAdvice: string } {
  const TEMPLATES: Record<string, { pct: number; items: { label: string; notes: string }[] }> = {
    recording:    { pct: 0.30, items: [{ label: 'Studio time', notes: 'Book in advance for best rates' }, { label: 'Session musicians', notes: '' }] },
    mixing:       { pct: 0.15, items: [{ label: 'Mixing engineer', notes: 'Budget for revisions' }, { label: 'Mastering', notes: '' }] },
    marketing:    { pct: 0.25, items: [{ label: 'Digital advertising', notes: 'Meta/TikTok/Spotify' }, { label: 'PR campaign', notes: '' }, { label: 'Playlist pitching', notes: '' }] },
    artwork:      { pct: 0.10, items: [{ label: 'Cover art & photography', notes: '' }] },
    video:        { pct: 0.15, items: [{ label: 'Music video production', notes: '' }] },
    distribution: { pct: 0.05, items: [{ label: 'Distribution (DistroKid/TuneCore)', notes: 'Annual fee' }] },
    legal:        { pct: 0.05, items: [{ label: 'Copyright filing & contracts', notes: '' }] },
    touring:      { pct: 0.15, items: [{ label: 'Touring & live costs', notes: '' }] },
    wardrobe:     { pct: 0.05, items: [{ label: 'Wardrobe & styling', notes: '' }] },
    content:      { pct: 0.10, items: [{ label: 'Content creation', notes: 'Social media & EPK' }] },
  }

  const focus = focusAreas.length > 0 ? focusAreas : ['recording', 'mixing', 'marketing']
  const included = focus.filter(f => TEMPLATES[f])

  // Distribute percentages among focus areas
  const totalPct = included.reduce((s, f) => s + (TEMPLATES[f]?.pct ?? 0.10), 0)
  const scaleFactor = 0.93 / totalPct  // leave 7% for contingency

  const lineItems: LineItemSuggestion[] = []
  let idx = 0
  let allocated = 0

  for (const f of included) {
    const tmpl = TEMPLATES[f]!
    const catBudget = Math.round(totalAmount * tmpl.pct * scaleFactor)
    const perItem = Math.floor(catBudget / tmpl.items.length)
    for (const item of tmpl.items) {
      lineItems.push({ category: f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, ' '), label: item.label, budgeted: perItem, notes: item.notes, sort_order: idx++ })
      allocated += perItem
    }
  }

  // Add contingency to reach total
  const remaining = totalAmount - allocated
  if (remaining > 0) {
    lineItems.push({ category: 'Miscellaneous', label: 'Contingency reserve', budgeted: remaining, notes: 'For unexpected costs', sort_order: idx })
  }

  return {
    lineItems,
    aiAdvice: 'Budget allocation generated based on your selected focus areas. Allocations follow industry-standard spending patterns for independent artists. Prioritize recording and mixing quality first — these are the hardest to fix after the fact. Invest in marketing only after you have a polished, release-ready product.',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { userId } = await requireAuth(req)

    const rl = makeLlmRatelimiter()
    const { success } = await rl.limit(userId)
    if (!success) return new Response(JSON.stringify({ error: 'Rate limited. Please wait before generating again.' }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

    const body: BudgetGenRequest = await req.json()
    const { totalAmount, currency, focusAreas, projectType, goals } = body

    if (!totalAmount || totalAmount <= 0) {
      return new Response(JSON.stringify({ error: 'totalAmount is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const sym = currency === 'USD' ? '$' : currency
    const numItems = totalAmount < 5000 ? 8 : totalAmount < 20000 ? 14 : 20

    const prompt = `You are a music industry financial advisor. Generate a budget for an independent artist.

Total: ${sym}${totalAmount.toLocaleString()} ${currency}
Type: ${projectType ?? 'music project'}
Focus: ${focusAreas.join(', ') || 'general'}
${goals ? `Goals: ${goals.slice(0, 200)}` : ''}

Generate exactly ${numItems} line items. All amounts must sum to ${totalAmount}.
Use these categories: Recording & Studio, Mixing & Mastering, Artwork & Creative, Music Video & Content, Marketing & Promotion, Distribution, Legal & Admin, Touring & Live, Wardrobe & Styling, Content Creation, Miscellaneous.

Return ONLY this JSON (no markdown):
{"lineItems":[{"category":"Recording & Studio","label":"Studio time (2 days)","budgeted":800,"notes":"Book early","sort_order":0}],"aiAdvice":"Brief 2-sentence strategic advice."}`

    let result: { lineItems: LineItemSuggestion[]; aiAdvice: string } | null = null

    try {
      const raw = await generateContent(
        [{ role: 'user', parts: [{ text: prompt }] }],
        GROQ_SMART,
      )

      // Strip markdown fences
      let cleaned = raw.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      }
      // Find JSON object boundaries
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1)
      }

      const parsed = JSON.parse(cleaned)
      if (parsed.lineItems?.length > 0) {
        // Balance total
        const total = parsed.lineItems.reduce((s: number, i: LineItemSuggestion) => s + (i.budgeted ?? 0), 0)
        if (Math.abs(total - totalAmount) > 1 && parsed.lineItems.length > 0) {
          const last = parsed.lineItems[parsed.lineItems.length - 1]
          last.budgeted = Math.max(0, last.budgeted + (totalAmount - total))
        }
        result = parsed
      }
    } catch (aiErr) {
      console.error('AI generation error, using fallback:', aiErr)
    }

    // If AI failed or returned empty, use rule-based fallback
    if (!result || result.lineItems.length === 0) {
      result = buildFallback(totalAmount, focusAreas)
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('budget-generate fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
