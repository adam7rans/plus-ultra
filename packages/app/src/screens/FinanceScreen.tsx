import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useFinance } from '../hooks/useFinance'
import { logExpense, deleteExpense, logContribution, deleteContribution } from '../lib/finance'
import { fetchTribeMeta } from '../lib/tribes'
import { getAuthority, hasAuthority } from '@plus-ultra/core'
import type { Tribe, TribeMember, ExpenseCategory } from '@plus-ultra/core'
import { useOfflineStage } from '../hooks/useOfflineStage'
import OfflineStageBanner from '../components/OfflineStageBanner'
import AppIcon, { type AppIconName } from '../components/AppIcon'
import { AppButton, AppCard, AppEmptyState, AppInput, AppSegmented, AppSelect } from '../components/ui'

type Tab = 'summary' | 'expenses' | 'contributions'

const EXPENSE_ICONS: Record<ExpenseCategory, string> = {
  supplies: '📦',
  equipment: '🔧',
  land: '🏕️',
  services: '🛠️',
  fuel: '⛽',
  training: '🎓',
  other: '💸',
}

// AppIcon names for the React-rendered expense rows. EXPENSE_ICONS above stays
// as-is: it is also interpolated into native <select> <option> labels, which
// cannot host React components.
const EXPENSE_APP_ICONS: Record<ExpenseCategory, AppIconName> = {
  supplies: 'box',
  equipment: 'wrench',
  land: 'tent',
  services: 'hammer',
  fuel: 'gas',
  training: 'graduation',
  other: 'money',
}

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  supplies: 'Supplies',
  equipment: 'Equipment',
  land: 'Land',
  services: 'Services',
  fuel: 'Fuel',
  training: 'Training',
  other: 'Other',
}

const CATEGORIES = Object.keys(EXPENSE_LABELS) as ExpenseCategory[]

function formatCents(cents: number): string {
  const abs = Math.abs(cents)
  return (cents < 0 ? '-' : '') + '$' + (abs / 100).toFixed(2)
}

function memberName(pub: string, members: TribeMember[]): string {
  return members.find(m => m.pubkey === pub)?.displayName ?? pub.slice(0, 8)
}

export default function FinanceScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/finance' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const { expenses, contributions, loading, getMemberBalance, fundBalance } = useFinance(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const { offlineStage, offlineSince } = useOfflineStage()

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canManage = hasAuthority(myAuth, 'elder_council')
  const canCreate = hasAuthority(myAuth, 'lead')

  const [tab, setTab] = useState<Tab>('summary')

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('supplies')
  const [expDescription, setExpDescription] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expPaidBy, setExpPaidBy] = useState('')
  const [expSplitAmong, setExpSplitAmong] = useState<string[]>([])
  const [expLinkedAsset, setExpLinkedAsset] = useState('')
  const [expReceiptNote, setExpReceiptNote] = useState('')
  const [savingExp, setSavingExp] = useState(false)

  // Contribution form
  const [showContribForm, setShowContribForm] = useState(false)
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [savingContrib, setSavingContrib] = useState(false)

  function openExpenseForm() {
    setExpCategory('supplies')
    setExpDescription('')
    setExpAmount('')
    setExpPaidBy(identity?.pub ?? '')
    setExpSplitAmong(members.map(m => m.pubkey))
    setExpLinkedAsset('')
    setExpReceiptNote('')
    setShowExpenseForm(true)
  }

  async function handleLogExpense() {
    if (!identity || !expDescription.trim() || !expAmount) return
    const dollars = parseFloat(expAmount)
    if (isNaN(dollars) || dollars <= 0) return
    setSavingExp(true)
    try {
      await logExpense(tribeId, {
        category: expCategory,
        description: expDescription,
        amountDollars: dollars,
        paidBy: expPaidBy || identity.pub,
        splitAmong: expSplitAmong,
        linkedAssetType: expLinkedAsset || undefined,
        receiptNote: expReceiptNote || undefined,
      }, identity.pub)
      setShowExpenseForm(false)
    } finally {
      setSavingExp(false)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    await deleteExpense(tribeId, expenseId)
  }

  async function handleLogContribution() {
    if (!identity || !contribAmount) return
    const dollars = parseFloat(contribAmount)
    if (isNaN(dollars) || dollars <= 0) return
    setSavingContrib(true)
    try {
      await logContribution(tribeId, {
        memberPub: identity.pub,
        amountDollars: dollars,
        note: contribNote || undefined,
      })
      setShowContribForm(false)
      setContribAmount('')
      setContribNote('')
    } finally {
      setSavingContrib(false)
    }
  }

  async function handleDeleteContribution(contributionId: string) {
    await deleteContribution(tribeId, contributionId)
  }

  const sortedExpenses = [...expenses].sort((a, b) => b.loggedAt - a.loggedAt)
  const sortedContributions = [...contributions].sort((a, b) => b.contributedAt - a.contributedAt)

  const memberBalances = members
    .map(m => ({ member: m, balance: getMemberBalance(m.pubkey) }))
    .sort((a, b) => b.balance - a.balance)

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300"
      >
        <AppIcon name="back" size={16} /> Dashboard
      </Link>

      <OfflineStageBanner stage={offlineStage} offlineSince={offlineSince} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100">Finances</h2>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <AppSegmented
          options={['summary', 'expenses', 'contributions'] as Tab[]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="space-y-4">
          {/* Fund balance */}
          <AppCard className="text-center">
            <div className="text-xs text-gray-400 mb-1">Tribe Fund Balance</div>
            <div className={`text-3xl font-mono font-bold ${
              fundBalance >= 0 ? 'text-forest-400' : 'text-danger-400'
            }`}>
              {formatCents(fundBalance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">contributions minus expenses</div>
          </AppCard>

          {/* Member balances */}
          {loading ? (
            <div className="text-center py-4 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : members.length === 0 ? (
            <AppEmptyState icon="users" title="No members yet" />
          ) : (
            <AppCard className="space-y-2">
              <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Member Balances</h3>
              {memberBalances.map(({ member, balance }) => (
                <div key={member.pubkey} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    {member.displayName ?? member.pubkey.slice(0, 8)}
                    {member.pubkey === identity?.pub && (
                      <span className="text-xs text-gray-500 ml-1">(you)</span>
                    )}
                  </span>
                  <span className={`text-sm font-mono font-semibold ${
                    balance > 0 ? 'text-forest-400' :
                    balance < 0 ? 'text-danger-400' :
                    'text-gray-500'
                  }`}>
                    {balance === 0 ? 'settled' :
                     balance > 0 ? `owed ${formatCents(balance)}` :
                     `owes ${formatCents(Math.abs(balance))}`}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-600 pt-2 border-t border-forest-800">
                Settlement is handled outside this app
              </p>
            </AppCard>
          )}
        </div>
      )}

      {/* Expenses tab */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          {(canCreate || canManage) && (
            <AppButton fullWidth className="text-sm" onClick={openExpenseForm}>
              + Log Expense
            </AppButton>
          )}

          {/* Expense form */}
          {showExpenseForm && (
            <AppCard className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">Log Expense</h3>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description *</label>
                <AppInput
                  placeholder="What was this expense for?"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <AppSelect
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{EXPENSE_ICONS[c]} {EXPENSE_LABELS[c]}</option>
                    ))}
                  </AppSelect>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Amount (USD) *</label>
                  <AppInput
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Paid by</label>
                <AppSelect
                  value={expPaidBy}
                  onChange={e => setExpPaidBy(e.target.value)}
                >
                  {members.map(m => (
                    <option key={m.pubkey} value={m.pubkey}>
                      {m.displayName ?? m.pubkey.slice(0, 8)}
                      {m.pubkey === identity?.pub ? ' (you)' : ''}
                    </option>
                  ))}
                </AppSelect>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Split among</label>
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => (
                    <button
                      key={m.pubkey}
                      type="button"
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        expSplitAmong.includes(m.pubkey)
                          ? 'bg-forest-700 border-forest-500 text-forest-200'
                          : 'bg-forest-900 border-forest-700 text-gray-400'
                      }`}
                      onClick={() => setExpSplitAmong(prev =>
                        prev.includes(m.pubkey)
                          ? prev.filter(p => p !== m.pubkey)
                          : [...prev, m.pubkey]
                      )}
                    >
                      {m.displayName ?? m.pubkey.slice(0, 8)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Receipt note (optional)</label>
                <AppInput
                  placeholder="e.g. receipt #1234"
                  value={expReceiptNote}
                  onChange={e => setExpReceiptNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <AppButton
                  className="flex-1 text-sm"
                  onClick={handleLogExpense}
                  disabled={savingExp || !expDescription.trim() || !expAmount}
                >
                  {savingExp ? 'Saving...' : 'Log Expense'}
                </AppButton>
                <AppButton
                  variant="secondary"
                  className="text-sm"
                  onClick={() => setShowExpenseForm(false)}
                >
                  Cancel
                </AppButton>
              </div>
            </AppCard>
          )}

          {loading ? (
            <div className="text-center py-8 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : sortedExpenses.length === 0 ? (
            <AppEmptyState icon="money" title="No expenses logged yet" />
          ) : (
            sortedExpenses.map(e => (
              <AppCard key={e.id}>
                <div className="flex items-start gap-3">
                  <AppIcon name={EXPENSE_APP_ICONS[e.category]} size={20} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100">{e.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Paid by {memberName(e.paidBy, members)} ·
                      split {e.splitAmong.length > 0 ? `${e.splitAmong.length} ways` : 'none'} ·
                      {new Date(e.loggedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-mono font-semibold text-gray-100">
                      {formatCents(e.amountCents)}
                    </span>
                    {(e.loggedBy === identity?.pub || canManage) && (
                      <AppButton
                        variant="icon"
                        icon="close"
                        iconSize={16}
                        className="!text-danger-400 hover:!text-danger-300"
                        onClick={() => handleDeleteExpense(e.id)}
                        aria-label="Delete expense"
                      />
                    )}
                  </div>
                </div>
              </AppCard>
            ))
          )}
        </div>
      )}

      {/* Contributions tab */}
      {tab === 'contributions' && (
        <div className="space-y-3">
          <AppButton
            fullWidth
            className="text-sm"
            onClick={() => setShowContribForm(true)}
          >
            + Add Contribution
          </AppButton>

          {/* Contribution form */}
          {showContribForm && (
            <AppCard className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">Add Contribution</h3>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (USD) *</label>
                <AppInput
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Note (optional)</label>
                <AppInput
                  placeholder="e.g. monthly dues"
                  value={contribNote}
                  onChange={e => setContribNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <AppButton
                  className="flex-1 text-sm"
                  onClick={handleLogContribution}
                  disabled={savingContrib || !contribAmount}
                >
                  {savingContrib ? 'Saving...' : 'Add'}
                </AppButton>
                <AppButton
                  variant="secondary"
                  className="text-sm"
                  onClick={() => { setShowContribForm(false); setContribAmount(''); setContribNote('') }}
                >
                  Cancel
                </AppButton>
              </div>
            </AppCard>
          )}

          {loading ? (
            <div className="text-center py-8 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : sortedContributions.length === 0 ? (
            <AppEmptyState icon="piggy" title="No contributions yet" />
          ) : (
            sortedContributions.map(c => (
              <AppCard key={c.id}>
                <div className="flex items-center gap-3">
                  <AppIcon name="money" size={20} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-100">
                      {memberName(c.memberPub, members)}
                      {c.note && <span className="text-gray-400 font-normal"> — {c.note}</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(c.contributedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-mono font-semibold text-forest-400">
                      {formatCents(c.amountCents)}
                    </span>
                    {(c.memberPub === identity?.pub || canManage) && (
                      <AppButton
                        variant="icon"
                        icon="close"
                        iconSize={16}
                        className="!text-danger-400 hover:!text-danger-300"
                        onClick={() => handleDeleteContribution(c.id)}
                        aria-label="Delete contribution"
                      />
                    )}
                  </div>
                </div>
              </AppCard>
            ))
          )}
        </div>
      )}
    </div>
  )
}
