import { ALERT_META } from '../lib/notifications'
import type { TribeAlert } from '../lib/notifications'

interface Props {
  alert: TribeAlert
  onDismiss: () => void
}

export default function AlertOverlay({ alert, onDismiss }: Props) {
  const meta = ALERT_META[alert.alertType]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-pulse-once">
      <div className={`max-w-sm w-full mx-4 rounded-2xl p-6 text-center ${meta.color} border border-white/20`}>
        <div className="text-6xl mb-4">{meta.icon}</div>
        <h2 className="text-2xl font-black text-white mb-2">{meta.label}</h2>
        {alert.message && (
          <p className="text-white/90 text-sm mb-4">{alert.message}</p>
        )}
        <p className="text-white/60 text-xs mb-6">
          From {alert.senderName}
        </p>
        <button
          className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm transition-colors"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
