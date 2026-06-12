'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, ChevronLeft, Map, Music2, Users, MessageCircle, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import { useProjectStatus } from '@/hooks/useTracks'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { UserButton } from '@/components/shared/UserButton'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

const STATUS_COLOR: Record<string, string> = {
  in_pre_production: 'text-muted-foreground',
  in_production: 'text-blue-600',
  in_post_production: 'text-orange-600',
  ready_for_release: 'text-sky-600',
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
  { label: 'Roadmap',       path: 'roadmap',       icon: Map },
  { label: 'Tracks',        path: 'tracks',        icon: Music2 },
  { label: 'Collaborators', path: 'collaborators', icon: Users },
  { label: 'Chat',          path: 'chat',          icon: MessageCircle },
  { label: 'Splits',        path: 'splits',        icon: PieChart },
]

export function ProjectHeader({ project, userId }: { project: Project; userId: string }) {
  const pathname = usePathname()
  const [showSettings, setShowSettings] = useState(false)
  const { data: liveProject } = useProjectStatus(project.id, project)

  const activeTab = TABS.find(t => pathname.endsWith(`/${t.path}`))?.path

  return (
    <>
      <div className="border-b border-border bg-card px-4 sm:px-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] pb-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors -ml-1 p-2 rounded-md shrink-0">
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-lg leading-tight truncate">{project.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground uppercase">{project.project_type}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className={cn('text-xs', STATUS_COLOR[liveProject.status])}>
                  {STATUS_LABEL[liveProject.status]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell userId={userId} />
            <UserButton userId={userId} />
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
              aria-label="Project Settings"
            >
              <Settings size={13} />
              <span className="hidden sm:inline">Project Settings</span>
            </button>
          </div>
        </div>

        <nav className="flex gap-1 -mb-px overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              href={`/projects/${project.id}/${path}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap',
                activeTab === path
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {showSettings && (
        <ProjectSettingsModal
          project={liveProject}
          userId={userId}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}
