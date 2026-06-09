'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

const STATUS_COLOR: Record<string, string> = {
  in_pre_production: 'text-muted-foreground',
  in_production: 'text-blue-600',
  in_post_production: 'text-amber-600',
  ready_for_release: 'text-emerald-600',
  released: 'text-violet-600',
}

const STATUS_LABEL: Record<string, string> = {
  in_pre_production: 'Pre-Production',
  in_production: 'In Production',
  in_post_production: 'Post-Production',
  ready_for_release: 'Ready for Release',
  released: 'Released',
}

const TABS = [
  { label: 'Roadmap', path: 'roadmap' },
  { label: 'Tracks', path: 'tracks' },
  { label: 'Stems', path: 'stems' },
  { label: 'Collaborators', path: 'collaborators' },
  { label: 'Chat', path: 'chat' },
  { label: 'Splits', path: 'splits' },
]

export function ProjectHeader({ project, userId }: { project: Project; userId: string }) {
  const pathname = usePathname()
  const [showSettings, setShowSettings] = useState(false)

  const activeTab = TABS.find(t => pathname.endsWith(`/${t.path}`))?.path

  return (
    <>
      <div className="border-b border-border bg-card px-6 pt-4 pb-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={18} />
            </Link>
            <div>
              <h1 className="font-semibold text-lg leading-tight">{project.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground capitalize">{project.project_type}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className={cn('text-xs', STATUS_COLOR[project.status])}>
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <Settings size={17} />
          </button>
        </div>

        <nav className="flex gap-1 -mb-px">
          {TABS.map(tab => (
            <Link
              key={tab.path}
              href={`/projects/${project.id}/${tab.path}`}
              className={cn(
                'px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.path
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {showSettings && (
        <ProjectSettingsModal
          project={project}
          userId={userId}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
