import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToDocs } from '../lib/docs'
import { useIsGridUp } from './useIsGridUp'
import type { TribeDoc, DocCategory } from '@plus-ultra/core'

export function useDocs(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.docs.listByTribe,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<TribeDoc[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp || !tribeId) return
    const timer = setTimeout(() => setGunLoading(false), 3000)
    const unsub = subscribeToDocs(tribeId, d => {
      setGunData(d)
      setGunLoading(false)
      clearTimeout(timer)
    })
    return () => {
      unsub()
      clearTimeout(timer)
    }
  }, [tribeId, gridUp])

  const docs = gridUp ? (convexData ?? []) as unknown as TribeDoc[] : gunData
  const loading = gridUp ? convexData === undefined : gunLoading

  const getDocsByCategory = (cat: DocCategory) => docs.filter(d => d.category === cat)
  const getActiveDocs = () => docs.filter(d => d.status === 'active')
  const getDraftDocs = () => docs.filter(d => d.status === 'draft')

  return { docs, loading, getDocsByCategory, getActiveDocs, getDraftDocs }
}
