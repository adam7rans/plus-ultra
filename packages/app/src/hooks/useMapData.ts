import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToMapData } from '../lib/map'
import { useIsGridUp } from './useIsGridUp'
import type { TribeMapPin, PatrolRoute, TribeTerritory } from '@plus-ultra/core'

export function useMapData(tribeId: string | null): {
  territory: TribeTerritory | null
  pins: TribeMapPin[]
  routes: PatrolRoute[]
  loading: boolean
} {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexPins = useQuery(
    api.map.listPins,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  const convexRoutes = useQuery(
    api.map.listRoutes,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  const convexTerritory = useQuery(
    api.map.getTerritory,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunTerritory, setGunTerritory] = useState<TribeTerritory | null>(null)
  const [gunPins, setGunPins] = useState<TribeMapPin[]>([])
  const [gunRoutes, setGunRoutes] = useState<PatrolRoute[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp || !tribeId) return
    setGunLoading(true)
    const unsub = subscribeToMapData(tribeId, (data) => {
      setGunTerritory(data.territory)
      setGunPins(data.pins)
      setGunRoutes(data.routes)
      setGunLoading(false)
    })
    return unsub
  }, [tribeId, gridUp])

  if (gridUp) {
    return {
      territory: (convexTerritory ?? null) as unknown as TribeTerritory | null,
      pins: (convexPins ?? []) as unknown as TribeMapPin[],
      routes: (convexRoutes ?? []) as unknown as PatrolRoute[],
      loading: convexPins === undefined || convexRoutes === undefined || convexTerritory === undefined,
    }
  }
  return { territory: gunTerritory, pins: gunPins, routes: gunRoutes, loading: gunLoading }
}
