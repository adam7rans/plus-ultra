import { useState } from 'react'
import { SECTIONS } from './types'
import type { Flow } from './types'

interface Props {
  flows: Flow[]
  activeId: number | null
  onSelect: (id: number) => void
}

export default function Sidebar({ flows, activeId, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('pu:collapsed') || '{}') } catch { return {} }
  })

  const toggle = (section: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [section]: !prev[section] }
      localStorage.setItem('pu:collapsed', JSON.stringify(next))
      return next
    })
  }

  return (
    <nav className="w-[240px] flex-shrink-0 bg-zinc-950 border-r border-zinc-800 overflow-y-auto flex flex-col">
      {SECTIONS.map(section => {
        const sectionFlows = flows.filter(f => f.section === section)
        if (sectionFlows.length === 0) return null
        const isCollapsed = collapsed[section]
        return (
          <div key={section}>
            <button
              onClick={() => toggle(section)}
              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 flex items-center gap-1.5"
            >
              <span className="text-[8px]">{isCollapsed ? '▶' : '▼'}</span>
              {section}
            </button>
            {!isCollapsed && (
              <div>
                {sectionFlows.map(flow => {
                  const isActive = flow.id === activeId
                  return (
                    <button
                      key={flow.id}
                      onClick={() => onSelect(flow.id)}
                      className={`w-full text-left px-3 py-1.5 border-l-2 text-[11px] leading-snug transition-colors ${
                        isActive
                          ? 'border-zinc-300 bg-zinc-800 text-zinc-200'
                          : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-zinc-600 mr-1.5">#{String(flow.id).padStart(2, '0')}</span>
                      {flow.title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
