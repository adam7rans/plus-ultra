import { useState } from 'react'
import { sendAlert, ALERT_META } from '../lib/notifications'
import type { AlertType } from '../lib/notifications'

const ALERT_TYPES: AlertType[] = ['emergency', 'perimeter_breach', 'medical', 'rally_point', 'all_clear']

interface Props {
  tribeId: string
  senderPub: string
  senderName: string
  onClose: () => void
}

export default function SendAlertModal({ tribeId, senderPub, senderName, onClose }: Props) {
  const [alertType, setAlertType] = useState<AlertType | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!alertType) return
    setSending(true)
    try {
      await sendAlert(tribeId, alertType, message.trim(), senderPub, senderName)
      onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 card border-danger-500/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-danger-400">🚨 Send Alert</h3>
          <button className="text-gray-500 hover:text-gray-300 text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-2 mb-4">
          {ALERT_TYPES.map(type => {
            const meta = ALERT_META[type]
            const isSelected = alertType === type
            return (
              <button
                key={type}
                onClick={() => setAlertType(type)}
                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                  isSelected
                    ? 'border-danger-500 bg-danger-900/30 text-gray-100'
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
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-danger-600 text-white hover:bg-danger-500 disabled:opacity-50 transition-colors"
            onClick={handleSend}
            disabled={!alertType || sending}
          >
            {sending ? 'Sending...' : 'Send Alert'}
          </button>
        </div>
      </div>
    </div>
  )
}
