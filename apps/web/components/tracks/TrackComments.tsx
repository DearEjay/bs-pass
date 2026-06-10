'use client'

import { useState } from 'react'
import {
  useTrackComments,
  useCreateTrackComment,
  useUpdateTrackComment,
  useDeleteTrackComment,
  type TrackComment,
} from '@/hooks/useTrackComments'
import { MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

interface TrackCommentsProps {
  trackId: string
  projectId: string
  currentUserId: string
  currentPlaybackTime: number
}

export function TrackComments({
  trackId,
  projectId,
  currentUserId,
  currentPlaybackTime,
}: TrackCommentsProps) {
  const { data: comments = [] } = useTrackComments(trackId)
  const createComment = useCreateTrackComment(trackId, projectId)
  const updateComment = useUpdateTrackComment(trackId)
  const deleteComment = useDeleteTrackComment(trackId)

  const [body, setBody] = useState('')
  const [capturedTimestamp, setCapturedTimestamp] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (body.length === 0 && capturedTimestamp === null) {
      setCapturedTimestamp(currentPlaybackTime)
    }
    setBody(e.target.value)
  }

  function handleClear() {
    setBody('')
    setCapturedTimestamp(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || capturedTimestamp === null) return
    await createComment.mutateAsync({
      body: body.trim(),
      timestamp_secs: capturedTimestamp,
      author_id: currentUserId,
    })
    setBody('')
    setCapturedTimestamp(null)
  }

  function startEdit(comment: TrackComment) {
    setEditingId(comment.id)
    setEditBody(comment.body)
  }

  async function handleEditSave(id: string) {
    if (!editBody.trim()) return
    await updateComment.mutateAsync({ id, body: editBody.trim() })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteComment.mutateAsync(id)
  }

  return (
    <div className="px-3 pb-3 border-t border-border/50 pt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2.5 flex items-center gap-1.5">
        <MessageSquare size={11} />
        Comments
        {comments.length > 0 && (
          <span className="text-muted-foreground/60">({comments.length})</span>
        )}
      </p>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {comments.map(comment => {
            const isActive = Math.abs(currentPlaybackTime - comment.timestamp_secs) < 1.5
            const isOwn = comment.author_id === currentUserId

            return (
              <div
                key={comment.id}
                className={cn(
                  'flex gap-2 px-2 py-1.5 rounded-md transition-colors text-xs',
                  isActive
                    ? 'bg-yellow-400/10 border border-yellow-400/25'
                    : 'hover:bg-accent/30',
                )}
              >
                {/* Timestamp badge */}
                <button
                  className="text-primary tabular-nums shrink-0 font-medium hover:underline mt-px"
                  title="Seek to this position"
                >
                  {formatTime(comment.timestamp_secs)}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === comment.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleEditSave(comment.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 px-2 py-0.5 rounded bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => handleEditSave(comment.id)}
                        disabled={updateComment.isPending}
                        className="text-primary hover:opacity-80 p-0.5"
                        aria-label="Save"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        aria-label="Cancel"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1 group">
                      <div className="flex-1 min-w-0 leading-relaxed">
                        <span className="font-medium text-muted-foreground mr-1">
                          {comment.profiles?.display_name ?? 'Unknown'}:
                        </span>
                        <span>{comment.body}</span>
                      </div>
                      {isOwn && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-px">
                          <button
                            onClick={() => startEdit(comment)}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label="Edit comment"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={deleteComment.isPending}
                            className="p-0.5 text-muted-foreground hover:text-destructive"
                            aria-label="Delete comment"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New comment input — audio keeps playing while typing */}
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <div className="flex-1 relative">
          <textarea
            value={body}
            onChange={handleChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder={
              capturedTimestamp !== null
                ? `Comment at ${formatTime(capturedTimestamp)}…`
                : 'Add a comment — captures timestamp on first keystroke'
            }
            rows={1}
            className="w-full px-2.5 py-1.5 pr-14 rounded-md bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          {capturedTimestamp !== null && (
            <span className="absolute right-2 top-1.5 text-xs text-primary/70 tabular-nums pointer-events-none">
              {formatTime(capturedTimestamp)}
            </span>
          )}
        </div>

        {body && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label="Clear"
          >
            <X size={12} />
          </button>
        )}

        <button
          type="submit"
          disabled={!body.trim() || capturedTimestamp === null || createComment.isPending}
          className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          Post
        </button>
      </form>
    </div>
  )
}
