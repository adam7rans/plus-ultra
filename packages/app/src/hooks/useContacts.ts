import { useEffect, useState } from 'react'
import { subscribeToContacts } from '../lib/contacts'
import type { ExternalContact } from '@plus-ultra/core'

export function useContacts(tribeId: string | null) {
  const [contacts, setContacts] = useState<ExternalContact[]>([])

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToContacts(tribeId, all => {
      setContacts([...all].sort((a, b) => a.name.localeCompare(b.name)))
    })
    return unsub
  }, [tribeId])

  return { contacts }
}
