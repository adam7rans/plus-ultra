import { useState } from 'react'
import { INFRA_ITEMS, INFRA_ITEM_LABELS } from '@plus-ultra/core'
import type { InfraItem, MemberInfraStatus } from '@plus-ultra/core'

interface Props {
  myFailingItems: InfraItem[]
  tribeStatuses: MemberInfraStatus[]
  myPub: string
  onToggle: (item: InfraItem) => Promise<void>
}

export default function InfraChecklistCard({
  myFailingItems,
  tribeStatuses,
  myPub,
  onToggle,
}: Props) {
  const [showTribeReports, setShowTribeReports] = useState(false)

  const otherStatuses = tribeStatuses.filter(s => s.memberPub !== myPub)

  return (
    <div className="card border-orange-700/40 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-orange-400 text-lg">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-orange-300">Infrastructure Status</p>
          <p className="text-xs text-gray-400">Tap items that are failing around you</p>
        </div>
      </div>

      {/* Button grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {INFRA_ITEMS.map(item => {
          const failing = myFailingItems.includes(item)
          return (
            <button
              key={item}
              onClick={() => void onToggle(item)}
              className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors border ${
                failing
                  ? 'bg-danger-900/50 border-danger-600/60 text-danger-300'
                  : 'bg-gray-900/40 border-gray-700/40 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span className="mr-1">{failing ? '✗' : '✓'}</span>
              {INFRA_ITEM_LABELS[item]}
            </button>
          )
        })}
      </div>

      {/* Tribe reports collapsible */}
      {otherStatuses.length > 0 && (
        <div>
          <button
            className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-300 py-1"
            onClick={() => setShowTribeReports(prev => !prev)}
          >
            <span>Tribe Reports ({otherStatuses.length})</span>
            <span>{showTribeReports ? '▲' : '▼'}</span>
          </button>
          {showTribeReports && (
            <div className="mt-2 space-y-2">
              {otherStatuses.map(s => {
                let items: InfraItem[] = []
                try { items = JSON.parse(s.failingItemsJson) } catch { items = [] }
                return (
                  <div key={s.memberPub} className="bg-gray-900/30 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-gray-300 mb-1">{s.displayName}</p>
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-500">No failures reported</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {items.map(item => (
                          <span
                            key={item}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-danger-900/50 text-danger-300 border border-danger-700/40"
                          >
                            {INFRA_ITEM_LABELS[item]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
