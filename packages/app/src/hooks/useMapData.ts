import { useEffect, useState } from 'react'
import { subscribeToMapData } from '../lib/map'
import type { TribeMapPin, PatrolRoute, TribeTerritory } from '@plus-ultra/core'

export function useMapData(tribeId: string | null): {
  territory: TribeTerritory | null
  pins: TribeMapPin[]
  routes: PatrolRoute[]
  loading: boolean
} {
  const [territory, setTerritory] = useState<TribeTerritory | null>(null)
  const [pins, setPins] = useState<TribeMapPin[]>([])
  const [routes, setRoutes] = useState<PatrolRoute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    setLoading(true)
    const unsub = subscribeToMapData(tribeId, (data) => {
      setTerritory(data.territory)
      setPins(data.pins)
      setRoutes(data.routes)
      setLoading(false)
    })
    return unsub
  }, [tribeId])

  return { territory, pins, routes, loading }
}
