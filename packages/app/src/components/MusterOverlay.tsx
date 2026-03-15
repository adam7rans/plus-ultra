import { useNavigate } from '@tanstack/react-router'
import { MUSTER_REASON_META } from '@plus-ultra/core'
import type { MusterCall } from '@plus-ultra/core'

interface Props {
  muster: MusterCall
  tribeId: string
  onLater: () => void
}

function elapsed(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function MusterOverlay({ muster, tribeId, onLater }: Props) {
  const navigate = useNavigate()
  const meta = MUSTER_REASON_META[muster.reason]

  function handleRespondNow() {
    onLater() // dismiss overlay before navigating
    navigate({ to: '/tribe/$tribeId/rollcall', params: { tribeId } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 rounded-2xl p-6 text-center bg-warning-900/80 border border-warning-500/40">
        <div className="text-6xl mb-3">📣</div>
        <h2 className="text-2xl font-black text-white mb-1">MUSTER CALLED</h2>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span>{meta.icon}</span>
          <span className="text-warning-300 font-semibold text-sm">{meta.label}</span>
        </div>
        {muster.message && (
          <p className="text-white/90 text-sm mb-3 px-2">{muster.message}</p>
        )}
        <p className="text-white/60 text-xs mb-6">
          Called by {muster.initiatedByName} · {elapsed(muster.initiatedAt)}
        </p>
        <button
          className="w-full py-3 rounded-xl bg-warning-500 hover:bg-warning-400 text-black font-bold text-sm transition-colors mb-2"
          onClick={handleRespondNow}
        >
          Respond Now
        </button>
        <button
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 font-semibold text-sm transition-colors"
          onClick={onLater}
        >
          Later
        </button>
      </div>
    </div>
  )
}
