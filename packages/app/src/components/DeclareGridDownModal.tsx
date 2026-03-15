import { useState } from 'react'

interface Props {
  onDeclare: (opts: { days: number; message?: string; isSimulation: boolean }) => Promise<void>
  onClose: () => void
}

const DURATION_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 },
  { label: 'Until cleared', days: 0 },
]

export default function DeclareGridDownModal({ onDeclare, onClose }: Props) {
  const [days, setDays] = useState(3)
  const [isSimulation, setIsSimulation] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDeclare() {
    setLoading(true)
    try {
      await onDeclare({ days, message: message.trim() || undefined, isSimulation })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-100 text-lg">Declare Grid-Down</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsSimulation(true)}
              className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${
                isSimulation
                  ? 'bg-warning-900/40 border-warning-500 text-warning-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              Simulation
            </button>
            <button
              onClick={() => setIsSimulation(false)}
              className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${
                !isSimulation
                  ? 'bg-danger-900/40 border-danger-500 text-danger-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              Real
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isSimulation ? 'Amber indicator — drill or training scenario' : 'Red indicator — actual grid-down crisis'}
          </p>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">Duration</label>
          <div className="grid grid-cols-4 gap-1">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  days === opt.days
                    ? 'bg-forest-900/50 border-forest-500 text-forest-300'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block">
            Message <span className="text-gray-600 normal-case">(optional)</span>
          </label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-forest-600"
            rows={2}
            placeholder="Brief situation update..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:border-gray-500 transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isSimulation
                ? 'bg-warning-700 hover:bg-warning-600 text-white'
                : 'bg-danger-700 hover:bg-danger-600 text-white'
            }`}
            onClick={handleDeclare}
            disabled={loading}
          >
            {loading ? 'Declaring...' : 'Declare Grid-Down'}
          </button>
        </div>
      </div>
    </div>
  )
}
