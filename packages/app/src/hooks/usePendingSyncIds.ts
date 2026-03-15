import { useEffect, useState } from 'react'
import { getPendingSyncIds } from '../lib/sync-queue'

export function usePendingSyncIds(tribeId: string): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!tribeId) return
    async function refresh() {
      setIds(new Set(await getPendingSyncIds(tribeId)))
    }
    void refresh()
    const interval = setInterval(() => { void refresh() }, 2000)
    return () => clearInterval(interval)
  }, [tribeId])
  return ids
}
