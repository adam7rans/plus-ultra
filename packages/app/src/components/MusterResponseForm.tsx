import { useState, useRef } from 'react'
import { MUSTER_STATUS_META } from '@plus-ultra/core'
import { createVoiceRecorder } from '../lib/media'
import type { MusterStatus } from '@plus-ultra/core'

const STATUSES: MusterStatus[] = ['present', 'away_authorized', 'away_unplanned', 'injured', 'need_help']

interface Props {
  /** If set, we're responding on behalf of this member (proxy mode) */
  proxyName?: string
  initialStatus?: MusterStatus
  initialLocation?: string
  initialNote?: string
  onSubmit: (
    status: MusterStatus,
    opts: { location?: string; note?: string; voiceNote?: string }
  ) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export default function MusterResponseForm({
  proxyName,
  initialStatus,
  initialLocation = '',
  initialNote = '',
  onSubmit,
  onCancel,
  submitLabel = 'Submit Response',
}: Props) {
  const [status, setStatus] = useState<MusterStatus | null>(initialStatus ?? null)
  const [location, setLocation] = useState(initialLocation)
  const [note, setNote] = useState(initialNote)
  const [voiceNote, setVoiceNote] = useState<{ base64: string; mimeType: string } | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const recorderRef = useRef(
    createVoiceRecorder((base64, mimeType) => {
      setVoiceNote({ base64, mimeType })
      setIsRecording(false)
    })
  )

  async function handleMicPress() {
    if (isRecording) {
      recorderRef.current.stop()
      return
    }
    setVoiceNote(null)
    const ok = await recorderRef.current.start()
    if (ok) setIsRecording(true)
  }

  async function handleSubmit() {
    if (!status) return
    setSubmitting(true)
    try {
      await onSubmit(status, {
        location: location.trim() || undefined,
        note: note.trim() || undefined,
        voiceNote: voiceNote?.base64,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {proxyName && (
        <div className="text-xs text-warning-400 font-semibold px-1">
          Responding on behalf of {proxyName}
        </div>
      )}

      {/* Status buttons */}
      <div className="space-y-2">
        {STATUSES.map(s => {
          const meta = MUSTER_STATUS_META[s]
          const isSelected = status === s
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                isSelected
                  ? 'border-forest-500 bg-forest-900/40 text-gray-100'
                  : 'border-forest-800 bg-forest-950 text-gray-400 hover:border-forest-700'
              }`}
            >
              <span className="text-xl">{meta.icon}</span>
              <span className={`text-sm font-semibold ${isSelected ? meta.color : ''}`}>{meta.label}</span>
            </button>
          )
        })}
      </div>

      {/* Location */}
      <input
        className="input"
        placeholder="Location (optional) — e.g. south perimeter, barn"
        value={location}
        onChange={e => setLocation(e.target.value)}
      />

      {/* Note */}
      <textarea
        className="input"
        rows={2}
        placeholder="Note (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      {/* Voice note */}
      <div className="flex items-center gap-3">
        <button
          onPointerDown={handleMicPress}
          onPointerUp={() => { if (isRecording) recorderRef.current.stop() }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
            isRecording
              ? 'border-danger-500 bg-danger-900/30 text-danger-300 animate-pulse'
              : 'border-forest-700 bg-forest-900/30 text-gray-400 hover:border-forest-600'
          }`}
        >
          🎙 {isRecording ? 'Recording…' : 'Voice note'}
        </button>
        {voiceNote && (
          <div className="flex items-center gap-2 flex-1">
            <audio
              controls
              src={`data:${voiceNote.mimeType};base64,${voiceNote.base64}`}
              className="h-8 flex-1"
            />
            <button
              className="text-gray-500 hover:text-gray-300 text-xs"
              onClick={() => setVoiceNote(null)}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        )}
        <button
          className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-forest-600 text-white hover:bg-forest-500 disabled:opacity-50 transition-colors"
          onClick={handleSubmit}
          disabled={!status || submitting}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
