import Link from 'next/link'
import { Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

const STATUS_LABEL: Record<string, string> = {
  in_pre_production: 'Pre-Production',
  in_production: 'In Production',
  in_post_production: 'Post-Production',
  ready_for_release: 'Ready for Release',
  released: 'Released',
}

const STATUS_DOT: Record<string, string> = {
  in_pre_production: 'bg-muted-foreground/50',
  in_production: 'bg-blue-500',
  in_post_production: 'bg-orange-500',
  ready_for_release: 'bg-sky-500',
  released: 'bg-violet-500',
}

const STATUS_TEXT: Record<string, string> = {
  in_pre_production: 'text-muted-foreground',
  in_production: 'text-blue-600',
  in_post_production: 'text-orange-600',
  ready_for_release: 'text-sky-600',
  released: 'text-violet-600',
}

const TYPE_LABEL: Record<string, string> = {
  album: 'Album',
  ep: 'EP',
  single: 'Single',
  mixtape: 'Mixtape',
}

export function ProjectCard({ project }: { project: Project }) {
  const typeLabel = TYPE_LABEL[project.project_type] ?? project.project_type
  const statusLabel = STATUS_LABEL[project.status] ?? project.status
  const statusDot = STATUS_DOT[project.status] ?? 'bg-muted-foreground/50'
  const statusText = STATUS_TEXT[project.status] ?? 'text-muted-foreground'

  return (
    <Link
      href={`/projects/${project.id}/roadmap`}
      className="flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-200 group aspect-[3/4]"
    >
      {/* Cover art — top 65% */}
      <div className="w-full flex-[0_0_65%] relative overflow-hidden bg-gradient-to-br from-muted to-muted/60">
        {project.cover_url ? (
          <img
            src={project.cover_url}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-background/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <Music2 size={26} className="text-muted-foreground/70" />
            </div>
          </div>
        )}
      </div>

      {/* Info — bottom 35% */}
      <div className="flex-1 min-h-0 px-3 py-2.5 flex flex-col justify-between">
        <p className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {project.title}
        </p>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot)} />
          <span className="text-xs text-muted-foreground truncate">
            {typeLabel}
            {project.genre ? ` · ${project.genre}` : ''}
          </span>
          <span className="text-muted-foreground/40 text-xs shrink-0">·</span>
          <span className={cn('text-xs font-medium truncate shrink-0', statusText)}>
            {statusLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}
