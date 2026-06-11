'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FolderOpen, X } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

const STATUS_LABELS: Record<string, string> = {
  in_pre_production: 'Pre-Production',
  in_production: 'In Production',
  in_post_production: 'Post-Production',
  ready_for_release: 'Ready for Release',
  released: 'Released',
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function CommandPalette({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { data: projects = [] } = useProjects(userId)

  const results = query.trim()
    ? projects.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
    : projects.slice(0, 8)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
        setQuery('')
        setSelected(0)
      }
      if (!open) return
      if (e.key === 'Escape') { setOpen(false); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) {
        navigateTo(results[selected])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, results, selected])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 10) }
  }, [open])

  useEffect(() => { setSelected(0) }, [query])

  function navigateTo(project: Project) {
    router.push(`/projects/${project.id}/roadmap`)
    setOpen(false)
    setQuery('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-[60] px-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border border-border text-muted-foreground font-mono">esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-xs text-muted-foreground text-center">
              {query ? `No projects matching "${query}"` : 'No projects yet'}
            </p>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigateTo(p)}
                onMouseEnter={() => setSelected(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  selected === i ? 'bg-accent' : 'hover:bg-accent/50',
                )}
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FolderOpen size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {highlight(p.title, query)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {p.project_type} · {STATUS_LABELS[p.status] ?? p.status}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4">
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">↵</kbd> open
          </span>
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border border-border font-mono text-[9px]">⌘K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  )
}
