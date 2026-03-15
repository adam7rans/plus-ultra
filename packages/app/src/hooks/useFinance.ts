import { useEffect, useState } from 'react'
import { subscribeToExpenses, subscribeToContributions, computeMemberBalance } from '../lib/finance'
import type { TribeExpense, FundContribution } from '@plus-ultra/core'

export function useFinance(tribeId: string | null) {
  const [expenses, setExpenses] = useState<TribeExpense[]>([])
  const [contributions, setContributions] = useState<FundContribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    const timer = setTimeout(() => setLoading(false), 3000)
    const unsubExpenses = subscribeToExpenses(tribeId, e => {
      setExpenses(e)
      setLoading(false)
      clearTimeout(timer)
    })
    const unsubContributions = subscribeToContributions(tribeId, setContributions)
    return () => {
      unsubExpenses()
      unsubContributions()
      clearTimeout(timer)
    }
  }, [tribeId])

  const getMemberBalance = (memberPub: string) =>
    computeMemberBalance(memberPub, expenses, contributions)

  const totalExpenses = expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amountCents, 0)

  const totalContributions = contributions
    .filter(c => c.currency === 'USD')
    .reduce((sum, c) => sum + c.amountCents, 0)

  const fundBalance = totalContributions - totalExpenses

  return {
    expenses,
    contributions,
    loading,
    getMemberBalance,
    fundBalance,
    totalContributions,
    totalExpenses,
  }
}
