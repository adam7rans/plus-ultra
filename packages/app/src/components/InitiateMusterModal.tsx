import { useState } from 'react'
import { MUSTER_REASON_META } from '@plus-ultra/core'
import type { MusterReason } from '@plus-ultra/core'
import AppIcon from './AppIcon'
import AppModal from './ui/AppModal'
import AppButton from './ui/AppButton'
import { AppTextarea } from './ui/AppField'
import { MUSTER_REASON_APP_ICONS } from './registry-icons'

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
    <AppModal title="Call Muster" icon="megaphone" onClose={onClose}>

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
                <span className="text-2xl"><AppIcon name={MUSTER_REASON_APP_ICONS[r]} size={24} /></span>
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
          <button
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-warning-600 text-black hover:bg-warning-500 disabled:opacity-50 transition-colors"
            onClick={handleSend}
            disabled={!reason || sending}
          >
            {sending ? 'Calling...' : 'Call Muster'}
          </button>
        </div>
    </AppModal>
  )
}
