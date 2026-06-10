'use client'

import { useState, useEffect } from 'react'
import {
  useSplits,
  useTrackSplitsLock,
  useUpsertSplits,
  useAutoPopulateSplits,
  useResetSplitsLock,
  useGeneratePdf,
  useEmailPdf,
} from '@/hooks/useSplits'
import { useCollaborators } from '@/hooks/useCollaborators'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { SignatureStatusBadge, TrackSignatureStatus } from './SignatureStatusBadge'
import { SplitAuditLog } from './SplitAuditLog'
import { RequestSignaturesModal } from './RequestSignaturesModal'
import {
  Sparkles, Lock, Unlock, Send, FileDown, Mail, AlertTriangle, Plus, Trash2, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Collaborator } from '@/hooks/useCollaborators'

interface SplitRow {
  collaborator_id: string
  percentage: number
}

function SplitEditor({
  projectId,
  trackId,
  collaborators,
  isMainArtist,
}: {
  projectId: string
  trackId: string
  collaborators: Collaborator[]
  isMainArtist: boolean
}) {
  const { data: splits = [] } = useSplits(trackId)
  const { data: agentLocked = false } = useTrackSplitsLock(trackId)
  const upsert = useUpsertSplits(trackId, projectId)
  const autoPopulate = useAutoPopulateSplits(trackId, projectId)
  const resetLock = useResetSplitsLock(trackId)
  const generatePdf = useGeneratePdf(projectId)
  const emailPdf = useEmailPdf(projectId)

  const [rows, setRows] = useState<SplitRow[]>([])
  const [editing, setEditing] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  // Sync rows from DB splits
  useEffect(() => {
    if (!editing) {
      setRows(splits.map(s => ({ collaborator_id: s.collaborator_id, percentage: s.percentage })))
    }
  }, [splits, editing])

  const total = rows.reduce((s, r) => s + Number(r.percentage), 0)
  const isValid = Math.abs(total - 100) <= 0.01

  const allSigned = splits.length > 0 && splits.every(s => s.split_status === 'signed')
  const anyPending = splits.some(s => s.split_status === 'pending' && s.signature_token !== null)
  const hasUnsignedSignatureRequest = anyPending

  function addRow() {
    const available = collaborators.filter(c => !rows.some(r => r.collaborator_id === c.id))
    if (available.length === 0) return
    setRows(prev => [...prev, { collaborator_id: available[0].id, percentage: 0 }])
  }

  function removeRow(idx: number) {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof SplitRow, value: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (field === 'percentage') return { ...r, percentage: Math.min(100, Math.max(0, parseFloat(value) || 0)) }
      return { ...r, [field]: value }
    }))
  }

  function distributeEvenly() {
    if (rows.length === 0) return
    const pct = parseFloat((100 / rows.length).toFixed(2))
    setRows(prev => prev.map((r, i) => ({
      ...r,
      percentage: i === prev.length - 1 ? 100 - pct * (prev.length - 1) : pct,
    })))
  }

  async function handleSave() {
    setSaveError(null)
    try {
      const result = await upsert.mutateAsync(rows)
      if (result.voided) {
        setSaveError('Splits saved. Previous signature requests have been voided.')
      }
      setEditing(false)
    } catch (e) {
      setSaveError((e as Error).message)
    }
  }

  async function handleAutoPopulate() {
    setSaveError(null)
    try {
      await autoPopulate.mutateAsync()
      setEditing(false)
    } catch (e) {
      setSaveError((e as Error).message)
    }
  }

  async function handleDownloadPdf() {
    setPdfError(null)
    try {
      await generatePdf.mutateAsync(trackId)
    } catch (e) {
      setPdfError((e as Error).message)
    }
  }

  async function handleEmailPdf() {
    setPdfError(null)
    try {
      await emailPdf.mutateAsync(trackId)
      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 4000)
    } catch (e) {
      setPdfError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrackSignatureStatus splits={splits} />
          {agentLocked && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock size={11} />
              Manual override
            </span>
          )}
        </div>

        {isMainArtist && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-populate CTA */}
            {!agentLocked && (
              <button
                onClick={handleAutoPopulate}
                disabled={autoPopulate.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                {autoPopulate.isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                Auto-populate from credits
              </button>
            )}

            {/* Reset lock */}
            {agentLocked && (
              <button
                onClick={() => resetLock.mutate()}
                disabled={resetLock.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <Unlock size={11} />
                Reset to track credits
              </button>
            )}

            {/* Edit splits */}
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition-colors"
              >
                Edit splits
              </button>
            )}

            {/* Request signatures — only when not fully signed */}
            {splits.length > 0 && !editing && !allSigned && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Send size={11} />
                {hasUnsignedSignatureRequest ? 'Resend' : 'Request signatures'}
              </button>
            )}

            {/* Fully-signed actions */}
            {allSigned && !editing && (
              <>
                <button
                  onClick={handleEmailPdf}
                  disabled={emailPdf.isPending || emailSent}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-70 transition-opacity"
                >
                  {emailPdf.isPending ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                  {emailSent ? 'Sent!' : 'Email PDF to all'}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={generatePdf.isPending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-xs font-medium hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
                >
                  {generatePdf.isPending ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                  Download PDF
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Split rows — view mode */}
      {!editing && splits.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/20">
            <span>Collaborator</span>
            <span className="text-right pr-8">Share</span>
            <span className="text-right">Status</span>
          </div>
          {splits.map(s => (
            <div key={s.id} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 border-b last:border-b-0 border-border">
              <div>
                <span className="text-sm font-medium">{s.collaborator.display_name ?? 'Unknown'}</span>
                {s.collaborator.roles.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {s.collaborator.roles.map(r => r.replace(/_/g, ' ')).join(' · ')}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums pr-8">{s.percentage.toFixed(2)}%</span>
              <SignatureStatusBadge status={s.split_status} />
            </div>
          ))}
          <div className="px-4 py-2 bg-muted/20 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className={cn('text-xs font-semibold tabular-nums',
              Math.abs(splits.reduce((s, x) => s + x.percentage, 0) - 100) <= 0.01
                ? 'text-emerald-600'
                : 'text-destructive'
            )}>
              {splits.reduce((s, x) => s + x.percentage, 0).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_36px] text-xs text-muted-foreground px-4 py-2 border-b border-border bg-muted/20">
              <span>Collaborator</span>
              <span className="text-right pr-2">Share</span>
              <span />
            </div>
            {rows.map((row, idx) => {
              const usedIds = rows.filter((_, i) => i !== idx).map(r => r.collaborator_id)
              const available = collaborators.filter(c => !usedIds.includes(c.id))
              return (
                <div key={idx} className="grid grid-cols-[1fr_120px_36px] items-center px-4 py-2.5 border-b last:border-b-0 border-border gap-2">
                  <select
                    value={row.collaborator_id}
                    onChange={e => updateRow(idx, 'collaborator_id', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {available.map(c => (
                      <option key={c.id} value={c.id}>{c.display_name ?? c.id}</option>
                    ))}
                    {/* keep the currently selected option */}
                    {!available.some(c => c.id === row.collaborator_id) && (
                      <option value={row.collaborator_id}>
                        {collaborators.find(c => c.id === row.collaborator_id)?.display_name ?? row.collaborator_id}
                      </option>
                    )}
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      value={row.percentage}
                      onChange={e => updateRow(idx, 'percentage', e.target.value)}
                      min={0}
                      max={100}
                      step={0.01}
                      className="w-full pl-2 pr-6 py-1.5 rounded-md bg-input border border-border text-sm tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <button
                    onClick={() => removeRow(idx)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Total indicator */}
          <div className={cn(
            'flex items-center justify-between px-3 py-2 rounded-md text-sm',
            isValid ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive',
          )}>
            <span className="font-medium">Total</span>
            <span className="font-semibold tabular-nums">{total.toFixed(2)}%</span>
          </div>

          {/* Edit actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={addRow}
              disabled={rows.length >= collaborators.length}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-50 transition-colors"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={distributeEvenly}
              className="px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-accent transition-colors"
            >
              Distribute evenly
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { setEditing(false); setSaveError(null) }}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || upsert.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {upsert.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!editing && splits.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground space-y-3">
          <p>No splits configured for this track.</p>
          {isMainArtist && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleAutoPopulate}
                disabled={autoPopulate.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {autoPopulate.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Auto-populate from credits
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent transition-colors"
              >
                Add manually
              </button>
            </div>
          )}
        </div>
      )}

      {/* Errors / notices */}
      {saveError && (
        <div className={cn(
          'flex items-start gap-2 p-3 rounded-md text-sm',
          saveError.startsWith('Splits saved')
            ? 'bg-amber-400/10 text-amber-700 dark:text-amber-400'
            : 'bg-destructive/10 text-destructive',
        )}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {saveError}
        </div>
      )}
      {pdfError && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {pdfError}
        </div>
      )}

      {showRequestModal && (
        <RequestSignaturesModal
          trackId={trackId}
          trackTitle=""
          projectId={projectId}
          splits={splits}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  )
}

// Per-track accordion item in the Splits tab
function TrackSplitItem({
  track,
  projectId,
  collaborators,
  isMainArtist,
}: {
  track: { id: string; title: string }
  projectId: string
  collaborators: Collaborator[]
  isMainArtist: boolean
}) {
  const { data: splits = [] } = useSplits(track.id)
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-sm truncate">{track.title}</span>
          <TrackSignatureStatus splits={splits} />
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
          <SplitEditor
            projectId={projectId}
            trackId={track.id}
            collaborators={collaborators}
            isMainArtist={isMainArtist}
          />
          <SplitAuditLog trackId={track.id} />
        </div>
      )}
    </div>
  )
}

export function SplitsPanel({
  projectId,
  tracks,
}: {
  projectId: string
  tracks: Array<{ id: string; title: string }>
}) {
  const { data: collaborators = [] } = useCollaborators(projectId)
  const { data: currentUser } = useCurrentUser()

  const isMainArtist = collaborators.some(c => c.user_id === currentUser?.id && c.is_main_artist)

  if (tracks.length === 0) {
    return (
      <div className="p-4 sm:p-6 text-center text-sm text-muted-foreground py-12">
        Add tracks to this project to manage splits.
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h2 className="font-semibold">Splits</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revenue splits and digital signatures per track
        </p>
      </div>

      <div className="space-y-3">
        {tracks.map(t => (
          <TrackSplitItem
            key={t.id}
            track={t}
            projectId={projectId}
            collaborators={collaborators}
            isMainArtist={isMainArtist}
          />
        ))}
      </div>
    </div>
  )
}
