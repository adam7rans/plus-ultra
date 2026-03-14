import { useEffect, useState } from 'react'
import { subscribeToAllCerts } from '../lib/certifications'
import type { MemberCertification } from '@plus-ultra/core'

export function useCertifications(tribeId: string | null): { certs: MemberCertification[]; loading: boolean } {
  const [certs, setCerts] = useState<MemberCertification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    setLoading(true)
    const unsub = subscribeToAllCerts(tribeId, (c) => {
      setCerts(c)
      setLoading(false)
    })
    return unsub
  }, [tribeId])

  return { certs, loading }
}
