export type ExpenseCategory = 'supplies' | 'equipment' | 'land' | 'services' | 'fuel' | 'training' | 'other'

export interface TribeExpense {
  id: string
  tribeId: string
  category: ExpenseCategory
  description: string
  amountCents: number       // integer, avoids float errors
  currency: string          // 'USD'
  paidBy: string            // memberPub
  splitAmong: string[]      // memberPubs — stored as splitAmongJson in Gun
  linkedAssetType?: string
  receiptNote?: string
  loggedAt: number
  loggedBy: string
}

export interface FundContribution {
  id: string
  tribeId: string
  memberPub: string
  amountCents: number
  currency: string
  note?: string
  contributedAt: number
}
