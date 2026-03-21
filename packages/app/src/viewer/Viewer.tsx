import { useState, useEffect, useCallback } from 'react'
import { ViewerProvider, useViewer } from './ViewerContext'
import ConfigBar from './ConfigBar'
import Sidebar from './Sidebar'
import FlowView from './FlowView'
import { ALL_FLOWS } from './flows'
import { flowToPath, pathToFlow } from './utils/slug'

function getInitialFlow() {
  const fromUrl = pathToFlow(window.location.pathname, ALL_FLOWS)
  if (fromUrl) return fromUrl.id
  const saved = localStorage.getItem('pu:activeFlow')
  return saved ? Number(saved) : ALL_FLOWS[0]?.id ?? 1
}

function ViewerInner() {
  const { toast } = useViewer()
  const [activeId, setActiveId] = useState<number>(getInitialFlow)

  const activeFlow = ALL_FLOWS.find(f => f.id === activeId) ?? ALL_FLOWS[0]

  const select = useCallback((id: number) => {
    setActiveId(id)
    localStorage.setItem('pu:activeFlow', String(id))
    const flow = ALL_FLOWS.find(f => f.id === id)
    if (flow) {
      window.history.pushState(null, '', flowToPath(flow.section, flow.title))
    }
  }, [])

  // Sync URL → flow on popstate (back/forward)
  useEffect(() => {
    const handler = () => {
      const match = pathToFlow(window.location.pathname, ALL_FLOWS)
      if (match) setActiveId(match.id)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const idx = ALL_FLOWS.findIndex(f => f.id === activeId)
      if ((e.key === 'ArrowUp' || e.key === 'k') && idx > 0) {
        select(ALL_FLOWS[idx - 1].id)
      } else if ((e.key === 'ArrowDown' || e.key === 'j') && idx < ALL_FLOWS.length - 1) {
        select(ALL_FLOWS[idx + 1].id)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeId, select])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 font-mono">
      <ConfigBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar flows={ALL_FLOWS} activeId={activeId} onSelect={select} />
        <main className="flex-1 overflow-y-auto p-8">
          {activeFlow && <FlowView flow={activeFlow} />}
        </main>
      </div>
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-600 text-zinc-200 text-[12px] px-4 py-2 rounded shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}

export default function Viewer() {
  return (
    <ViewerProvider>
      <ViewerInner />
    </ViewerProvider>
  )
}
