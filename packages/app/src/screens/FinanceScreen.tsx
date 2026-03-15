import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useFinance } from '../hooks/useFinance'
import { logExpense, deleteExpense, logContribution, deleteContribution } from '../lib/finance'
import { fetchTribeMeta } from '../lib/tribes'
import { getAuthority, hasAuthority } from '@plus-ultra/core'
import type { Tribe, TribeMember, ExpenseCategory } from '@plus-ultra/core'

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
        ← Dashboard
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100">Finances</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-forest-900/50 p-1 rounded-lg">
        {(['summary', 'expenses', 'contributions'] as Tab[]).map(t => (
          <button
            key={t}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${
              tab === t ? 'bg-forest-700 text-gray-100' : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="space-y-4">
          {/* Fund balance */}
          <div className="card text-center">
            <div className="text-xs text-gray-400 mb-1">Tribe Fund Balance</div>
            <div className={`text-3xl font-mono font-bold ${
              fundBalance >= 0 ? 'text-forest-400' : 'text-danger-400'
            }`}>
              {formatCents(fundBalance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">contributions minus expenses</div>
          </div>

          {/* Member balances */}
          {loading ? (
            <div className="text-center py-4 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : members.length === 0 ? (
            <div className="card text-center py-6">
              <p className="text-gray-400 text-sm">No members yet</p>
            </div>
          ) : (
            <div className="card space-y-2">
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
            </div>
          )}
        </div>
      )}

      {/* Expenses tab */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          {(canCreate || canManage) && (
            <button className="btn-primary w-full text-sm" onClick={openExpenseForm}>
              + Log Expense
            </button>
          )}

          {/* Expense form */}
          {showExpenseForm && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">Log Expense</h3>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description *</label>
                <input
                  className="input w-full"
                  placeholder="What was this expense for?"
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Category</label>
                  <select
                    className="input w-full"
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{EXPENSE_ICONS[c]} {EXPENSE_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Amount (USD) *</label>
                  <input
                    className="input w-full"
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
                <select
                  className="input w-full"
                  value={expPaidBy}
                  onChange={e => setExpPaidBy(e.target.value)}
                >
                  {members.map(m => (
                    <option key={m.pubkey} value={m.pubkey}>
                      {m.displayName ?? m.pubkey.slice(0, 8)}
                      {m.pubkey === identity?.pub ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
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
                <input
                  className="input w-full"
                  placeholder="e.g. receipt #1234"
                  value={expReceiptNote}
                  onChange={e => setExpReceiptNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1 text-sm"
                  onClick={handleLogExpense}
                  disabled={savingExp || !expDescription.trim() || !expAmount}
                >
                  {savingExp ? 'Saving...' : 'Log Expense'}
                </button>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => setShowExpenseForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : sortedExpenses.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">No expenses logged yet</p>
            </div>
          ) : (
            sortedExpenses.map(e => (
              <div key={e.id} className="card">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{EXPENSE_ICONS[e.category]}</span>
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
                      <button
                        className="text-xs text-danger-400 hover:text-danger-300"
                        onClick={() => handleDeleteExpense(e.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contributions tab */}
      {tab === 'contributions' && (
        <div className="space-y-3">
          <button
            className="btn-primary w-full text-sm"
            onClick={() => setShowContribForm(true)}
          >
            + Add Contribution
          </button>

          {/* Contribution form */}
          {showContribForm && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-gray-200">Add Contribution</h3>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (USD) *</label>
                <input
                  className="input w-full"
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
                <input
                  className="input w-full"
                  placeholder="e.g. monthly dues"
                  value={contribNote}
                  onChange={e => setContribNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-1 text-sm"
                  onClick={handleLogContribution}
                  disabled={savingContrib || !contribAmount}
                >
                  {savingContrib ? 'Saving...' : 'Add'}
                </button>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => { setShowContribForm(false); setContribAmount(''); setContribNote('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : sortedContributions.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">No contributions yet</p>
            </div>
          ) : (
            sortedContributions.map(c => (
              <div key={c.id} className="card">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💰</span>
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
                      <button
                        className="text-xs text-danger-400 hover:text-danger-300"
                        onClick={() => handleDeleteContribution(c.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
