import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { subscribeToExpenses, subscribeToContributions, computeMemberBalance } from '../lib/finance'
import { useIsGridUp } from './useIsGridUp'
import type { TribeExpense, FundContribution } from '@plus-ultra/core'

export function useFinance(tribeId: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexExpenses = useQuery(
    api.finance.listExpenses,
    gridUp && tribeId ? { tribeId } : 'skip'
  )
  const convexContributions = useQuery(
    api.finance.listContributions,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscriptions
  const [gunExpenses, setGunExpenses] = useState<TribeExpense[]>([])
  const [gunContributions, setGunContributions] = useState<FundContribution[]>([])
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp || !tribeId) return
    const timer = setTimeout(() => setGunLoading(false), 3000)
    const unsubExpenses = subscribeToExpenses(tribeId, e => {
      setGunExpenses(e)
      setGunLoading(false)
      clearTimeout(timer)
    })
    const unsubContributions = subscribeToContributions(tribeId, setGunContributions)
    return () => {
      unsubExpenses()
      unsubContributions()
      clearTimeout(timer)
    }
  }, [tribeId, gridUp])

  const expenses = gridUp ? (convexExpenses ?? []) as unknown as TribeExpense[] : gunExpenses
  const contributions = gridUp ? (convexContributions ?? []) as unknown as FundContribution[] : gunContributions
  const loading = gridUp
    ? convexExpenses === undefined || convexContributions === undefined
    : gunLoading

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
