import { useState } from 'react'
import { Link } from '@tanstack/react-router'

interface Props {
  tribeId: string
}

const CHECKLIST = [
  {
    label: 'Respond to muster',
    to: '/tribe/$tribeId/rollcall' as const,
  },
  {
    label: 'Review PACE comms plan',
    to: '/tribe/$tribeId/comms' as const,
  },
  {
    label: 'Check inventory & supply levels',
    to: '/tribe/$tribeId/inventory' as const,
  },
  {
    label: 'Review bug-out plan',
    to: '/tribe/$tribeId/bugout' as const,
  },
]

export default function DrillChecklistCard({ tribeId }: Props) {
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false))

  function toggle(i: number) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  const allChecked = checked.every(Boolean)

  return (
    <div className="card border-warning-500 bg-warning-900/20 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-warning-300 font-bold text-sm">⚡ Grid-Down Drill Checklist</span>
      </div>
      {allChecked ? (
        <p className="text-sm text-forest-400 font-semibold">Drill checklist complete ✓</p>
      ) : (
        <ul className="space-y-2">
          {CHECKLIST.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <button
                onClick={() => toggle(i)}
                className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                  checked[i]
                    ? 'bg-forest-600 border-forest-500 text-white'
                    : 'border-warning-600 bg-transparent'
                }`}
              >
                {checked[i] ? '✓' : ''}
              </button>
              <Link
                to={item.to}
                params={{ tribeId }}
                className={`text-xs underline ${
                  checked[i] ? 'text-gray-500 line-through' : 'text-warning-300 hover:text-warning-200'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
