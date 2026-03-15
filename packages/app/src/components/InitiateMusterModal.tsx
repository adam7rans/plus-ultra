import { useState } from 'react'
import { MUSTER_REASON_META } from '@plus-ultra/core'
import type { MusterReason } from '@plus-ultra/core'

const REASONS: MusterReason[] = ['emergency', 'security', 'routine_drill', 'check_in', 'other']

interface Props {
  onInitiate: (reason: MusterReason, message?: string) => Promise<unknown>
  onClose: () => void
}

export default function InitiateMusterModal({ onInitiate, onClose }: Props) {
  const [reason, setReason] = useState<MusterReason | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!reason) return
    setSending(true)
    try {
      await onInitiate(reason, message.trim() || undefined)
      onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 card border-warning-500/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-warning-400">📣 Call Muster</h3>
          <button className="text-gray-500 hover:text-gray-300 text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-2 mb-4">
          {REASONS.map(r => {
            const meta = MUSTER_REASON_META[r]
            const isSelected = reason === r
            return (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  isSelected
                    ? 'border-warning-500 bg-warning-900/30 text-gray-100'
                    : 'border-forest-800 bg-forest-950 text-gray-400 hover:border-forest-700'
                }`}
              >
                <span className="text-2xl">{meta.icon}</span>
                <span className="text-sm font-semibold">{meta.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mb-4">
          <textarea
            className="input"
            rows={2}
            placeholder="Optional message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-warning-600 text-black hover:bg-warning-500 disabled:opacity-50 transition-colors"
            onClick={handleSend}
            disabled={!reason || sending}
          >
            {sending ? 'Calling...' : 'Call Muster'}
          </button>
        </div>
      </div>
    </div>
  )
}
