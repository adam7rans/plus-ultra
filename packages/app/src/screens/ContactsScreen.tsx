import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useContacts } from '../hooks/useContacts'
import { addContact, updateContact, deleteContact, markVerified } from '../lib/contacts'
import type { ExternalContact, ContactCategory } from '@plus-ultra/core'

const CATEGORY_META: Record<ContactCategory, { label: string; icon: string }> = {
  medical:    { label: 'Medical',    icon: '🏥' },
  legal:      { label: 'Legal',      icon: '⚖️' },
  comms:      { label: 'Comms',      icon: '📻' },
  supply:     { label: 'Supply',     icon: '🛒' },
  mutual_aid: { label: 'Mutual Aid', icon: '🤝' },
  authority:  { label: 'Authority',  icon: '🚔' },
  other:      { label: 'Other',      icon: '👤' },
}

const CATEGORY_ORDER: ContactCategory[] = [
  'medical', 'legal', 'comms', 'supply', 'mutual_aid', 'authority', 'other',
]

function formatVerified(ts: number | undefined): string {
  if (!ts) return 'Never verified'
  return `Last verified ${new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

interface ContactFormState {
  name: string
  category: ContactCategory
  role: string
  phone: string
  radioFreq: string
  location: string
  lat: string
  lng: string
  notes: string
}

const EMPTY_FORM: ContactFormState = {
  name: '',
  category: 'other',
  role: '',
  phone: '',
  radioFreq: '',
  location: '',
  lat: '',
  lng: '',
  notes: '',
}

export default function ContactsScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/contacts' })
  const { identity } = useIdentity()
  const { contacts } = useContacts(tribeId)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<ContactCategory | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<ExternalContact | null>(null)
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const filtered = contacts.filter(c => {
    if (filterCategory !== 'all' && c.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.role?.toLowerCase().includes(q) ?? false) ||
        (c.notes?.toLowerCase().includes(q) ?? false) ||
        (c.location?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  // Group by category
  const grouped = new Map<ContactCategory, ExternalContact[]>()
  for (const cat of CATEGORY_ORDER) {
    const items = filtered.filter(c => c.category === cat)
    if (items.length > 0) grouped.set(cat, items)
  }

  function openAdd() {
    setEditingContact(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(c: ExternalContact) {
    setEditingContact(c)
    setForm({
      name: c.name,
      category: c.category,
      role: c.role ?? '',
      phone: c.phone ?? '',
      radioFreq: c.radioFreq ?? '',
      location: c.location ?? '',
      lat: c.lat != null ? String(c.lat) : '',
      lng: c.lng != null ? String(c.lng) : '',
      notes: c.notes ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingContact(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.name.trim() || !identity) return
    setSaving(true)
    try {
      const fields = {
        name: form.name.trim(),
        category: form.category,
        role: form.role.trim() || undefined,
        phone: form.phone.trim() || undefined,
        radioFreq: form.radioFreq.trim() || undefined,
        location: form.location.trim() || undefined,
        lat: form.lat !== '' ? parseFloat(form.lat) : undefined,
        lng: form.lng !== '' ? parseFloat(form.lng) : undefined,
        notes: form.notes.trim() || undefined,
      }

      if (editingContact) {
        await updateContact(tribeId, editingContact.id, fields)
      } else {
        await addContact(tribeId, { ...fields, addedBy: identity.pub }, identity.pub)
      }
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: ExternalContact) {
    if (!confirm(`Delete ${c.name}?`)) return
    await deleteContact(tribeId, c.id)
    if (expandedId === c.id) setExpandedId(null)
  }

  async function handleMarkVerified(c: ExternalContact) {
    await markVerified(tribeId, c.id)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <Link
        to="/tribe/$tribeId"
        params={{ tribeId }}
        className="text-forest-400 text-sm mb-4 flex items-center gap-2 hover:text-forest-300"
      >
        ← Dashboard
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100">Contacts</h2>
        <button className="btn-primary text-sm px-3 py-1.5" onClick={openAdd}>
          + Add Contact
        </button>
      </div>

      {/* Search */}
      <input
        className="input text-sm mb-3"
        placeholder="Search name, role, notes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            filterCategory === 'all'
              ? 'border-forest-500 bg-forest-800 text-forest-300'
              : 'border-forest-800 text-gray-400 hover:border-forest-600'
          }`}
          onClick={() => setFilterCategory('all')}
        >
          All
        </button>
        {CATEGORY_ORDER.map(cat => (
          <button
            key={cat}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterCategory === cat
                ? 'border-forest-500 bg-forest-800 text-forest-300'
                : 'border-forest-800 text-gray-400 hover:border-forest-600'
            }`}
            onClick={() => setFilterCategory(cat)}
          >
            {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
          </button>
        ))}
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-400 text-sm">
            {contacts.length === 0 ? 'No contacts yet — add doctors, HAM ops, vendors, and allies' : 'No contacts match your search'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{CATEGORY_META[cat].icon}</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
                  {CATEGORY_META[cat].label}
                </span>
              </div>
              <div className="space-y-1">
                {items.map(c => (
                  <div key={c.id} className="card p-0 overflow-hidden">
                    {/* Row */}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-forest-900/30 transition-colors"
                      onClick={() => setExpandedId(prev => prev === c.id ? null : c.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-100 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {[c.role, c.phone].filter(Boolean).join(' · ')}
                        </p>
                        <p className="text-xs text-gray-600">{formatVerified(c.lastVerified)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          className="text-xs text-forest-400 hover:text-forest-300 px-2 py-1 border border-forest-800 rounded"
                          onClick={e => { e.stopPropagation(); openEdit(c) }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-base text-danger-400 hover:text-danger-300 px-1"
                          onClick={e => { e.stopPropagation(); void handleDelete(c) }}
                        >
                          ×
                        </button>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expandedId === c.id && (
                      <div className="border-t border-forest-800 px-3 py-3 space-y-1">
                        {c.role && <p className="text-xs text-gray-300"><span className="text-gray-500">Role:</span> {c.role}</p>}
                        {c.phone && <p className="text-xs text-gray-300"><span className="text-gray-500">Phone:</span> {c.phone}</p>}
                        {c.radioFreq && <p className="text-xs text-gray-300"><span className="text-gray-500">Radio:</span> {c.radioFreq}</p>}
                        {c.location && <p className="text-xs text-gray-300"><span className="text-gray-500">Location:</span> {c.location}</p>}
                        {c.lat != null && c.lng != null && (
                          <p className="text-xs text-gray-500">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</p>
                        )}
                        {c.notes && <p className="text-xs text-gray-300"><span className="text-gray-500">Notes:</span> {c.notes}</p>}
                        <div className="flex gap-2 pt-2">
                          <button
                            className="text-xs px-3 py-1 border border-forest-700 text-forest-400 rounded hover:border-forest-500 transition-colors"
                            onClick={() => void handleMarkVerified(c)}
                          >
                            Mark Verified
                          </button>
                          <button
                            className="text-xs px-3 py-1 border border-forest-700 text-forest-400 rounded hover:border-forest-500 transition-colors"
                            onClick={() => openEdit(c)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs px-3 py-1 border border-danger-800 text-danger-400 rounded hover:border-danger-600 transition-colors"
                            onClick={() => void handleDelete(c)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit bottom sheet */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-[2000]"
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div className="bg-forest-950 border border-forest-700 rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-100 font-semibold">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button className="text-gray-400 hover:text-gray-200 text-lg px-1" onClick={closeForm}>×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Name *</label>
                <input
                  className="input text-sm"
                  placeholder="Dr. Jane Smith"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category *</label>
                <select
                  className="input text-sm"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ContactCategory }))}
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Role</label>
                <input
                  className="input text-sm"
                  placeholder="EMT, HAM operator, County Sheriff..."
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                <input
                  className="input text-sm"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Radio Frequency</label>
                <input
                  className="input text-sm"
                  placeholder="146.520 MHz / KD9XYZ"
                  value={form.radioFreq}
                  onChange={e => setForm(f => ({ ...f, radioFreq: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Location</label>
                <input
                  className="input text-sm"
                  placeholder="Address or landmark"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Latitude (enables map pin)</label>
                  <input
                    className="input text-sm"
                    type="number"
                    placeholder="39.7392"
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Longitude</label>
                  <input
                    className="input text-sm"
                    type="number"
                    placeholder="-104.9903"
                    value={form.lng}
                    onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                <input
                  className="input text-sm"
                  placeholder="Any additional notes"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                className="btn-primary flex-1"
                onClick={() => void handleSave()}
                disabled={saving || !form.name.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn-secondary flex-1" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
