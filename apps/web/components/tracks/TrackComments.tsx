'use client'

import { useState } from 'react'
import {
  useTrackComments,
  useCreateTrackComment,
  useUpdateTrackComment,
  useDeleteTrackComment,
  type TrackComment,
} from '@/hooks/useTrackComments'
import { Pencil, Trash2, Check, X, Send, User } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

interface TrackCommentsProps {
  trackId: string
  trackVersionId: string | null
  projectId: string
  currentUserId: string
  currentPlaybackTime: number
  onSeek?: (seconds: number) => void
}

export function TrackComments({
  trackId,
  trackVersionId,
  projectId,
  currentUserId,
  currentPlaybackTime,
  onSeek,
}: TrackCommentsProps) {
  const { data: comments = [] } = useTrackComments(trackId, trackVersionId)
  const createComment = useCreateTrackComment(trackId, trackVersionId, projectId)
  const updateComment = useUpdateTrackComment(trackId, trackVersionId)
  const deleteComment = useDeleteTrackComment(trackId, trackVersionId)

  const [body, setBody] = useState('')
  const [capturedTimestamp, setCapturedTimestamp] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (body.length === 0 && capturedTimestamp === null) {
      setCapturedTimestamp(currentPlaybackTime)
    }
    setBody(e.target.value)
  }

  function handleClear() {
    setBody('')
    setCapturedTimestamp(null)
    setSubmitError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || capturedTimestamp === null) return
    setSubmitError(null)
    try {
      await createComment.mutateAsync({
        body: body.trim(),
        timestamp_secs: capturedTimestamp,
        author_id: currentUserId,
      })
      setBody('')
      setCapturedTimestamp(null)
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as Record<string, unknown>)?.message as string ?? JSON.stringify(err)
      setSubmitError(msg)
      console.error('[TrackComments] insert failed:', err)
    }
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
    <div className="border-t border-border/50">
      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User size={12} className="text-muted-foreground" />
        </div>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            value={body}
            onChange={handleChange}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
              if (e.key === 'Escape') handleClear()
            }}
            placeholder="Write a comment…"
            className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0"
          />
          {capturedTimestamp !== null && (
            <span className="text-[10px] text-primary/70 tabular-nums shrink-0">
              at {formatTime(capturedTimestamp)}
            </span>
          )}
          {body && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
              aria-label="Clear"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!body.trim() || capturedTimestamp === null || createComment.isPending}
          className="text-primary disabled:text-muted-foreground/40 transition-colors shrink-0"
          aria-label="Post comment"
        >
          <Send size={13} />
        </button>
      </form>

      {submitError && (
        <p className="text-[10px] text-destructive px-3 pb-2 -mt-1">{submitError}</p>
      )}

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="border-t border-border/40 px-3 py-2 space-y-0">
          {comments.map(comment => {
            const isOwn = comment.author_id === currentUserId
            const initial = (comment.profiles?.display_name?.[0] ?? '?').toUpperCase()

            return (
              <div key={comment.id} className="flex gap-2.5 py-2 group">
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground shrink-0 flex items-center justify-center text-[10px] font-semibold mt-0.5">
                  {initial}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground">
                      {comment.profiles?.display_name ?? 'Unknown'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSeek?.(comment.timestamp_secs)}
                      className={cn(
                        'text-[10px] tabular-nums shrink-0 transition-colors',
                        onSeek
                          ? 'text-primary/60 hover:text-primary hover:underline cursor-pointer'
                          : 'text-muted-foreground/50 cursor-default',
                      )}
                    >
                      at {formatTime(comment.timestamp_secs)}
                    </button>
                  </div>

                  {editingId === comment.id ? (
                    <div className="flex items-center gap-1 mt-0.5">
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
                    <div className="flex items-start gap-1">
                      <p className="text-xs text-muted-foreground flex-1 mt-0.5 leading-relaxed">
                        {comment.body}
                      </p>
                      {isOwn && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                          <button
                            onClick={() => startEdit(comment)}
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label="Edit comment"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={deleteComment.isPending}
                            className="p-0.5 text-muted-foreground hover:text-destructive"
                            aria-label="Delete comment"
                          >
                            <Trash2 size={10} />
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
    </div>
  )
}
