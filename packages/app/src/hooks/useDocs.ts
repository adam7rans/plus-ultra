import { useEffect, useState } from 'react'
import { subscribeToDocs } from '../lib/docs'
import type { TribeDoc, DocCategory } from '@plus-ultra/core'

export function useDocs(tribeId: string | null) {
  const [docs, setDocs] = useState<TribeDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    const timer = setTimeout(() => setLoading(false), 3000)
    const unsub = subscribeToDocs(tribeId, d => {
      setDocs(d)
      setLoading(false)
      clearTimeout(timer)
    })
    return () => {
      unsub()
      clearTimeout(timer)
    }
  }, [tribeId])

  const getDocsByCategory = (cat: DocCategory) => docs.filter(d => d.category === cat)
  const getActiveDocs = () => docs.filter(d => d.status === 'active')
  const getDraftDocs = () => docs.filter(d => d.status === 'draft')

  return { docs, loading, getDocsByCategory, getActiveDocs, getDraftDocs }
}
