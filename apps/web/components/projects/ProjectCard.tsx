import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']

const STATUS_LABEL: Record<string, string> = {
  in_pre_production: 'Pre-Production',
  in_production: 'Production',
  in_post_production: 'Post-Production',
  ready_for_release: 'Ready',
  released: 'Released',
}

const STATUS_COLOR: Record<string, string> = {
  in_pre_production: 'text-muted-foreground border-border',
  in_production: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  in_post_production: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  ready_for_release: 'text-green-400 border-green-400/30 bg-green-400/10',
  released: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
}

const TYPE_LABEL: Record<string, string> = {
  album: 'Album',
  ep: 'EP',
  single: 'Single',
  mixtape: 'Mixtape',
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}/tracks`}
      className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:bg-accent/50 transition-colors group"
    >
      {project.cover_url ? (
        <div className="w-full aspect-square rounded-md overflow-hidden mb-4 bg-secondary">
          <img src={project.cover_url} alt={project.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-square rounded-md mb-4 bg-secondary flex items-center justify-center">
          <span className="text-4xl">🎵</span>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {project.title}
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {TYPE_LABEL[project.project_type] ?? project.project_type}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded border',
            STATUS_COLOR[project.status] ?? 'text-muted-foreground border-border',
          )}>
            {STATUS_LABEL[project.status] ?? project.status}
          </span>
        </div>

        {project.genre && (
          <p className="text-xs text-muted-foreground">{project.genre}</p>
        )}
      </div>
    </Link>
  )
}
