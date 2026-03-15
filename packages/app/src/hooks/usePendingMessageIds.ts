import { useEffect, useState } from 'react'
import { getDB } from '../lib/db'

export function usePendingMessageIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    async function refresh() {
      const db = await getDB()
      const keys = await db.getAllKeys('queued-messages') as string[]
      setIds(new Set(keys))
    }
    void refresh()
    const interval = setInterval(() => { void refresh() }, 2000)
    return () => clearInterval(interval)
  }, [])
  return ids
}
