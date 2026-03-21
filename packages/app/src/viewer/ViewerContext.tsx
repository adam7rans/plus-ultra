import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'

interface ViewerContextValue {
  appUrl: string
  setAppUrl: (url: string) => void
  tribeId: string
  setTribeId: (id: string) => void
  toast: string
  showToast: (msg: string, isError?: boolean) => void
}

const ViewerContext = createContext<ViewerContextValue | null>(null)

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [appUrl, setAppUrlRaw] = useState(
    () => localStorage.getItem('pu:appUrl') || window.location.origin,
  )
  const [tribeId, setTribeIdRaw] = useState(
    () => localStorage.getItem('pu:tribeId') || '',
  )
  const [toast, setToast] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setAppUrl = useCallback((url: string) => {
    const clean = url.trim().replace(/\/$/, '')
    setAppUrlRaw(clean)
    localStorage.setItem('pu:appUrl', clean)
  }, [])

  const setTribeId = useCallback((id: string) => {
    const clean = id.trim()
    setTribeIdRaw(clean)
    localStorage.setItem('pu:tribeId', clean)
  }, [])

  const showToast = useCallback((msg: string, _isError?: boolean) => {
    setToast(msg)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(''), 3000)
  }, [])

  return (
    <ViewerContext.Provider value={{ appUrl, setAppUrl, tribeId, setTribeId, toast, showToast }}>
      {children}
    </ViewerContext.Provider>
  )
}

export function useViewer() {
  const ctx = useContext(ViewerContext)
  if (!ctx) throw new Error('useViewer must be inside ViewerProvider')
  return ctx
}
