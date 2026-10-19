import { useState } from 'react'
import { sendAlert, ALERT_META } from '../lib/notifications'
import type { AlertType } from '../lib/notifications'
import AppIcon, { type AppIconName } from './AppIcon'
import AppModal from './ui/AppModal'
import AppButton from './ui/AppButton'
import { AppTextarea } from './ui/AppField'

const ALERT_ICONS: Record<AlertType, AppIconName> = {
  emergency: 'siren',
  perimeter_breach: 'shieldAlert',
  medical: 'firstAid',
  rally_point: 'pin',
  all_clear: 'check',
  bug_out: 'navigate',
}

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
    <AppModal title="Send Alert" icon="siren" tone="danger" onClose={onClose}>
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
                <span className="text-2xl"><AppIcon name={ALERT_ICONS[type]} size={24} /></span>
                <span className="text-sm font-semibold">{meta.label}</span>
              </button>
            )
          })}
        </div>

        <div className="mb-4">
          <AppTextarea
            rows={2}
            placeholder="Optional message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <AppButton variant="secondary" fullWidth onClick={onClose}>Cancel</AppButton>
          <AppButton
            variant="danger"
            fullWidth
            onClick={handleSend}
            disabled={!alertType || sending}
            loading={sending}
          >
            {sending ? 'Sending...' : 'Send Alert'}
          </AppButton>
        </div>
    </AppModal>
  )
}
