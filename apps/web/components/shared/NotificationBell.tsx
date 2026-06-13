'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Bell, CheckCheck, X,
  AtSign, Users, CheckSquare, Music2, FileSignature,
} from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/chat-utils'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

interface NotifConfig {
  Icon: React.ElementType
  iconBg: string
  iconColor: string
  text: React.ReactNode
  href: string | null
}

function ProjectLink({ title }: { title: string }) {
  return <span className="font-semibold text-primary underline underline-offset-2">{title}</span>
}

function getConfig(n: Notification): NotifConfig {
  const p = (n.payload ?? {}) as Record<string, string>
  const pid = n.project_id
  const proj = p.projectTitle ? <ProjectLink title={p.projectTitle} /> : 'a project'

  switch (n.type) {
    case 'mention':
      return {
        Icon: AtSign,
        iconBg: 'bg-violet-500/15',
        iconColor: 'text-violet-500',
        text: <>{p.senderName ?? 'Someone'} mentioned you in {proj}</>,
        href: pid ? `/projects/${pid}/chat` : null,
      }
    case 'collaborator_added':
      return {
        Icon: Users,
        iconBg: 'bg-blue-500/15',
        iconColor: 'text-blue-500',
        text: <>You&apos;ve been added to {proj}{p.role ? ` as ${p.role}` : ''}</>,
        href: pid ? `/projects/${pid}/roadmap` : null,
      }
    case 'collaborator_removed':
      return {
        Icon: Users,
        iconBg: 'bg-destructive/15',
        iconColor: 'text-destructive',
        text: <>You were removed from {proj}</>,
        href: null,
      }
    case 'task_assigned':
      return {
        Icon: CheckSquare,
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-500',
        text: <>{p.assignedBy ?? 'Someone'} assigned you{p.taskTitle ? ` "${p.taskTitle}"` : ' a task'}{p.projectTitle ? <> in {proj}</> : ''}</>,
        href: pid ? `/projects/${pid}/roadmap` : null,
      }
    case 'track_status_changed':
      return {
        Icon: Music2,
        iconBg: 'bg-teal-500/15',
        iconColor: 'text-teal-500',
        text: <>&ldquo;{p.trackTitle ?? 'A track'}&rdquo; moved to {p.newStatus ?? 'a new status'}{p.projectTitle ? <> in {proj}</> : ''}</>,
        href: pid ? `/projects/${pid}/roadmap` : null,
      }
    case 'split_request':
      return {
        Icon: FileSignature,
        iconBg: 'bg-orange-500/15',
        iconColor: 'text-orange-500',
        text: <>Sign your split for &ldquo;{p.trackTitle ?? 'a track'}&rdquo;{p.projectTitle ? <> in {proj}</> : ''}</>,
        href: p.signUrl ?? (pid ? `/projects/${pid}/splits` : null),
      }
    default:
      return {
        Icon: Bell,
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground',
        text: p.message ?? n.type.replace(/_/g, ' '),
        href: pid ? `/projects/${pid}/roadmap` : null,
      }
  }
}

function NotificationItem({
  notification,
  onRead,
  onClose,
}: {
  notification: Notification
  onRead: (id: string) => void
  onClose: () => void
}) {
  const { Icon, iconBg, iconColor, text, href } = getConfig(notification)
  const isUnread = !notification.read_at

  function handleClick() {
    if (isUnread) onRead(notification.id)
    onClose()
  }

  const content = (
    <div className={cn(
      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
      isUnread && 'bg-primary/5',
    )}>
      <div className={cn('mt-0.5 p-2 rounded-full shrink-0', isUnread ? iconBg : 'bg-muted')}>
        <Icon size={13} className={isUnread ? iconColor : 'text-muted-foreground'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs leading-relaxed',
          isUnread ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}>
          {text}
        </p>
        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {isUnread && <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
    </div>
  )

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className="block">
        {content}
      </Link>
    )
  }

  return (
    <button onClick={handleClick} className="w-full">
      {content}
    </button>
  )
}

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications(userId)
  const markRead = useMarkNotificationRead(userId)
  const markAllRead = useMarkAllNotificationsRead(userId)

  const unreadCount = notifications.filter(n => !n.read_at).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-full border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={13} />
                    All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={id => markRead.mutate(id)}
                    onClose={() => setOpen(false)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
