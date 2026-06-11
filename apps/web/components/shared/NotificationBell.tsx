'use client'

import { useState } from 'react'
import { Bell, CheckCheck, X, Map, Music2, Users, MessageCircle } from 'lucide-react'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  task_assigned: Map,
  collaborator_added: Users,
  collaborator_removed: Users,
  track_status_changed: Music2,
  chat_mention: MessageCircle,
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const payload = notification.payload as Record<string, string>
  const Icon = TYPE_ICONS[notification.type] ?? Bell
  const isUnread = !notification.read_at

  return (
    <button
      onClick={() => { if (isUnread) onRead(notification.id) }}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
        isUnread && 'bg-primary/5',
      )}
    >
      <div className={cn(
        'mt-0.5 p-1.5 rounded-full shrink-0',
        isUnread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
      )}>
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs leading-relaxed', isUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {payload.message ?? notification.type.replace(/_/g, ' ')}
        </p>
        {payload.project_title && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{payload.project_title}</p>
        )}
        <p className="text-xs text-muted-foreground/50 mt-0.5">{timeAgo(notification.created_at)}</p>
      </div>
      {isUnread && <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
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
