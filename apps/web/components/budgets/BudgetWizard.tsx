'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useCreateBudget, useBudgetForProject } from '@/hooks/useBudgets'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  ChevronRight, ChevronLeft, Check, DollarSign, Sparkles,
  AlertTriangle, Loader2, Mic2, Blend,
  Camera, Video, Megaphone, Globe, Scale, Plane, Shirt, Clapperboard,
  Trash2, Plus,
} from 'lucide-react'

// ── Focus area config ───────────────────────────────────────────────────────

interface FocusArea {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const FOCUS_AREAS: FocusArea[] = [
  { id: 'recording',    label: 'Recording & Studio',    description: 'Studio time, session musicians, features', icon: Mic2 },
  { id: 'mixing',       label: 'Mixing & Mastering',    description: 'Mixing engineer, mastering, stem delivery', icon: Blend },
  { id: 'artwork',      label: 'Artwork & Creative',    description: 'Cover art, graphic design, photography', icon: Camera },
  { id: 'video',        label: 'Music Video & Content', description: 'Director, crew, editing, lyric videos', icon: Video },
  { id: 'marketing',    label: 'Marketing & Promotion', description: 'Digital ads, PR, playlists, influencers', icon: Megaphone },
  { id: 'distribution', label: 'Distribution',          description: 'Streaming, physical copies, merch', icon: Globe },
  { id: 'legal',        label: 'Legal & Admin',         description: 'Copyright, splits, contracts', icon: Scale },
  { id: 'touring',      label: 'Touring & Live',        description: 'Shows, travel, sound engineer, venues', icon: Plane },
  { id: 'wardrobe',     label: 'Wardrobe & Styling',    description: 'Costumes, stylist, hair & makeup', icon: Shirt },
  { id: 'content',      label: 'Content Creation',      description: 'Social media, EPK, behind-the-scenes', icon: Clapperboard },
]

// ── Step components ─────────────────────────────────────────────────────────

const STEPS = ['Setup', 'Budget', 'Focus', 'Goals', 'Review'] as const
type Step = 0 | 1 | 2 | 3 | 4

// Step 1: name + optional project link
function StepSetup({
  userId,
  title, setTitle,
  projectId, setProjectId,
}: {
  userId: string
  title: string; setTitle: (v: string) => void
  projectId: string | null; setProjectId: (v: string | null) => void
}) {
  const { data: projects } = useProjects(userId)
  const { data: existingBudget } = useBudgetForProject(projectId)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Name your budget</h2>
        <p className="text-sm text-muted-foreground mt-1">Give it a clear name so you can find it later.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Budget name</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Summer EP Budget 2026"
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Link to a project <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <select
          value={projectId ?? ''}
          onChange={e => setProjectId(e.target.value || null)}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">No project link</option>
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Linking lets you track spending alongside your project's progress. One budget per project.
        </p>
      </div>

      {existingBudget && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            This project already has a budget (<strong>{existingBudget.title}</strong>). Linking this new budget will replace it.
          </span>
        </div>
      )}
    </div>
  )
}

// Step 2: total amount + currency
function StepBudget({
  amount, setAmount,
  currency, setCurrency,
}: {
  amount: string; setAmount: (v: string) => void
  currency: string; setCurrency: (v: string) => void
}) {
  const CURRENCIES = [
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'CAD', label: 'CAD — Canadian Dollar' },
    { value: 'AUD', label: 'AUD — Australian Dollar' },
  ]

  const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">What's your total budget?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is the total amount you have available to spend on this project.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Currency</label>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Total amount</label>
        <div className="relative">
          <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="number"
            min={1}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-8 pr-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Quick amounts</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm border transition-colors',
                amount === String(a)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              ${a.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {amount && Number(amount) > 0 && (
        <div className="px-3 py-2.5 rounded-md bg-muted/50 border border-border text-sm text-muted-foreground">
          {Number(amount) < 2000 && '💡 Lean budget — AI will focus on the essentials for max impact.'}
          {Number(amount) >= 2000 && Number(amount) < 10000 && '💡 Solid independent budget — room to cover production, marketing, and some extras.'}
          {Number(amount) >= 10000 && Number(amount) < 50000 && '💡 Strong budget — you can build a comprehensive campaign around this release.'}
          {Number(amount) >= 50000 && '💡 Major-level investment — AI will build a full-scale release plan with professional crew at every stage.'}
        </div>
      )}
    </div>
  )
}

// Step 3: focus areas multi-select
function StepFocus({ selected, toggle }: { selected: string[]; toggle: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">What matters most to you?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select all the areas you want to invest in. AI will prioritize allocation toward these.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FOCUS_AREAS.map(({ id, label, description, icon: Icon }) => {
          const on = selected.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={cn(
                'flex items-start gap-3 px-3 py-3 rounded-lg border text-left transition-all',
                on
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              <div className={cn('mt-0.5 shrink-0', on ? 'text-primary' : 'text-muted-foreground')}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className={cn('text-sm font-medium', on ? 'text-foreground' : '')}>{label}</div>
                <div className="text-xs text-muted-foreground leading-tight mt-0.5">{description}</div>
              </div>
              {on && <Check size={14} className="ml-auto shrink-0 text-primary mt-0.5" />}
            </button>
          )
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Select at least one focus area so AI can tailor your budget.
        </p>
      )}
    </div>
  )
}

// Step 4: goals text
function StepGoals({ goals, setGoals, projectType, setProjectType }: {
  goals: string; setGoals: (v: string) => void
  projectType: string; setProjectType: (v: string) => void
}) {
  const PROJECT_TYPES = [
    { value: '', label: 'Not specified' },
    { value: 'single', label: 'Single' },
    { value: 'ep', label: 'EP' },
    { value: 'album', label: 'Album' },
    { value: 'mixtape', label: 'Mixtape' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Tell AI about your goals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The more context you give, the sharper the budget recommendation.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Release type <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setProjectType(pt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm border transition-colors',
                projectType === pt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Goals & context <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={goals}
          onChange={e => setGoals(e.target.value)}
          placeholder="e.g. Dropping a debut EP to build buzz in the NYC hip-hop scene. Want to invest heavily in a music video and Instagram/TikTok ads. Release date is September 2026. No label — fully independent."
          rows={5}
          className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Describe your release, target audience, timeline, channels you care about, or anything else that should influence spend.
        </p>
      </div>
    </div>
  )
}

// Step 5: AI loading + review (editable)
interface GeneratedItem {
  category: string
  label: string
  budgeted: number
  notes: string
  sort_order: number
}

function StepReview({
  loading,
  error,
  lineItems,
  setLineItems,
  aiAdvice,
  totalAmount,
  currency,
}: {
  loading: boolean
  error: string | null
  lineItems: GeneratedItem[]
  setLineItems: (items: GeneratedItem[]) => void
  aiAdvice: string
  totalAmount: number
  currency: string
}) {
  const sym = currency === 'USD' ? '$' : currency
  const [editing, setEditing] = useState<{ idx: number; field: 'label' | 'budgeted' | 'category' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const total = lineItems.reduce((s, i) => s + i.budgeted, 0)
  const diff = total - totalAmount

  const categories = [...new Set(lineItems.map(i => i.category))]

  function startEdit(idx: number, field: 'label' | 'budgeted' | 'category') {
    const item = lineItems[idx]
    setEditValue(field === 'budgeted' ? String(item.budgeted) : field === 'category' ? item.category : item.label)
    setEditing({ idx, field })
    setTimeout(() => { inputRef.current?.select() }, 0)
  }

  function commitEdit(idx: number, field: 'label' | 'budgeted' | 'category', raw: string) {
    const updated = [...lineItems]
    if (field === 'budgeted') {
      const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
      if (!isNaN(n) && n >= 0) updated[idx] = { ...updated[idx], budgeted: Math.round(n) }
    } else if (field === 'category') {
      const newCat = raw.trim()
      if (newCat) updated[idx] = { ...updated[idx], category: newCat }
    } else {
      const newLabel = raw.trim()
      if (newLabel) updated[idx] = { ...updated[idx], label: newLabel }
    }
    setLineItems(updated)
    setEditing(null)
  }

  function deleteItem(idx: number) {
    setLineItems(lineItems.filter((_, i) => i !== idx))
  }

  function addItem(category: string) {
    const maxSort = lineItems.reduce((m, i) => Math.max(m, i.sort_order), 0)
    setLineItems([...lineItems, { category, label: 'New item', budgeted: 0, notes: '', sort_order: maxSort + 1 }])
  }

  // Called as {renderCell(...)} — NOT <RenderCell /> — no remount on state change
  function renderCell(idx: number, field: 'label' | 'budgeted' | 'category', display: string, align: 'left' | 'right' = 'left') {
    const isEditing = editing?.idx === idx && editing.field === field
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setEditing(null); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(idx, field, editValue) }
          }}
          onBlur={() => commitEdit(idx, field, editValue)}
          className={cn(
            'w-full px-2 py-0.5 text-sm bg-blue-50 border border-blue-400 rounded focus:outline-none ring-2 ring-blue-300/40 dark:bg-blue-900/30 dark:border-blue-500',
            align === 'right' && 'text-right font-mono',
          )}
        />
      )
    }
    return (
      <span
        onClick={() => startEdit(idx, field)}
        title="Click to edit"
        className={cn(
          'cursor-text rounded px-1 -mx-1 hover:bg-muted/60 transition-colors',
          align === 'right' && 'font-mono',
        )}
      >
        {display}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Analyzing your goals…</p>
          <p className="text-sm text-muted-foreground mt-1">AI is building your budget allocation.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <AlertTriangle size={32} className="text-destructive" />
        <p className="font-medium text-destructive">Generation failed</p>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          Your AI Budget
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Click any label or amount to edit it. Add or remove line items before creating.
        </p>
      </div>

      {aiAdvice && (
        <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground leading-relaxed">
          <p className="font-medium text-primary mb-1.5 flex items-center gap-1.5">
            <Sparkles size={13} /> AI Insights
          </p>
          {aiAdvice}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 grid grid-cols-[1fr_auto_auto] text-xs font-medium text-muted-foreground">
          <span>Item</span>
          <span className="text-right pr-8">Amount</span>
          <span />
        </div>

        {categories.map(cat => {
          const catItems = lineItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.category === cat)
          const subtotal = catItems.reduce((s, { item }) => s + item.budgeted, 0)
          return (
            <div key={cat}>
              <div className="px-4 py-2 bg-muted/30 flex items-center justify-between border-t border-border">
                <span className="text-xs font-semibold text-foreground">{cat}</span>
                <span className="text-xs font-semibold text-foreground">
                  {sym}{subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>

              {catItems.map(({ item, idx }) => (
                <div key={idx} className="group px-4 py-2 border-t border-border/50 grid grid-cols-[1fr_auto_auto] items-center gap-3">
                  <div className="min-w-0">
                    {renderCell(idx, 'label', item.label, 'left')}
                    {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="text-sm text-right w-24">
                    {sym}{renderCell(idx, 'budgeted', item.budgeted.toLocaleString(undefined, { maximumFractionDigits: 0 }), 'right')}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteItem(idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50"
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <div className="px-4 py-1.5 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => addItem(cat)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={12} /> Add item
                </button>
              </div>
            </div>
          )
        })}

        <div className={cn(
          'px-4 py-3 border-t border-border flex items-center justify-between',
          Math.abs(diff) > 1 ? 'bg-amber-500/5' : 'bg-foreground/5',
        )}>
          <span className="font-semibold text-sm">Total</span>
          <div className="text-right">
            <span className="font-semibold font-mono text-sm">
              {sym}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            {Math.abs(diff) > 1 && (
              <p className="text-xs text-amber-500 mt-0.5">
                {diff > 0 ? `${sym}${diff.toLocaleString(undefined, { maximumFractionDigits: 0 })} over` : `${sym}${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 })} under`} target of {sym}{totalAmount.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main wizard ─────────────────────────────────────────────────────────────

export function BudgetWizard({ userId }: { userId: string }) {
  const router = useRouter()
  const createBudget = useCreateBudget(userId)

  // Step state
  const [step, setStep] = useState<Step>(0)

  // Form values
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [goals, setGoals] = useState('')
  const [projectType, setProjectType] = useState('')

  // AI generation
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<GeneratedItem[]>([])
  const [aiAdvice, setAiAdvice] = useState('')
  const [generatedOnce, setGeneratedOnce] = useState(false)

  const [saving, setSaving] = useState(false)

  function toggleFocusArea(id: string) {
    setFocusAreas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  function canAdvance() {
    if (step === 0) return title.trim().length > 0
    if (step === 1) return !!amount && Number(amount) > 0
    if (step === 2) return focusAreas.length > 0
    if (step === 3) return true
    if (step === 4) return lineItems.length > 0 && !generating && !genError
    return true
  }

  async function generateBudget() {
    setGenerating(true)
    setGenError(null)
    setLineItems([])
    setAiAdvice('')
    setGeneratedOnce(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

      const res = await fetch(`${supabaseUrl}/functions/v1/budget-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          totalAmount: Number(amount),
          currency,
          focusAreas,
          projectType: projectType || undefined,
          goals: goals.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setLineItems(data.lineItems ?? [])
      setAiAdvice(data.aiAdvice ?? '')
    } catch (e) {
      setGenError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function handleNext() {
    if (step === 3 && !generatedOnce) {
      setStep(4)
      await generateBudget()
      return
    }
    if (step < 4) {
      setStep((step + 1) as Step)
    }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // 1. Create the budget
      const budget = await createBudget.mutateAsync({
        title: title.trim(),
        project_id: projectId || null,
        total_amount: Number(amount),
        currency,
        focus_areas: focusAreas,
        ai_advice: aiAdvice || null,
        status: 'active',
      })

      // 2. Insert all line items
      if (lineItems.length > 0) {
        const rows = lineItems.map((item, idx) => ({
          budget_id: budget.id,
          category: item.category,
          label: item.label,
          budgeted: item.budgeted,
          actual: 0,
          notes: item.notes || null,
          sort_order: item.sort_order ?? idx,
        }))
        await supabase.from('budget_line_items').insert(rows)
      }

      router.push(`/budgets/${budget.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors',
                i < step ? 'bg-primary text-primary-foreground'
                  : i === step ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground',
              )}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <div className={cn(
                'h-0.5 flex-1 mx-1 transition-colors',
                i < step ? 'bg-primary' : 'bg-border',
                i === STEPS.length - 1 && 'hidden',
              )} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-0.5">
          {STEPS.map(label => (
            <span key={label} className="w-7 text-center">{label}</span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[320px]">
        {step === 0 && (
          <StepSetup
            userId={userId}
            title={title} setTitle={setTitle}
            projectId={projectId} setProjectId={setProjectId}
          />
        )}
        {step === 1 && (
          <StepBudget
            amount={amount} setAmount={setAmount}
            currency={currency} setCurrency={setCurrency}
          />
        )}
        {step === 2 && (
          <StepFocus selected={focusAreas} toggle={toggleFocusArea} />
        )}
        {step === 3 && (
          <StepGoals
            goals={goals} setGoals={setGoals}
            projectType={projectType} setProjectType={setProjectType}
          />
        )}
        {step === 4 && (
          <StepReview
            loading={generating}
            error={genError}
            lineItems={lineItems}
            setLineItems={setLineItems}
            aiAdvice={aiAdvice}
            totalAmount={Number(amount)}
            currency={currency}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => setStep((step - 1) as Step)}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
          Back
        </button>

        <div className="flex items-center gap-2">
          {step === 4 && lineItems.length > 0 && !generating && (
            <button
              type="button"
              onClick={generateBudget}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles size={13} />
              Regenerate
            </button>
          )}

          {step < 4 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {step === 3 ? (
                <>
                  <Sparkles size={13} />
                  Generate Budget
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canAdvance() || saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Creating…' : 'Create Budget'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
