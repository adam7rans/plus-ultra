import { useState, useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useIdentity } from '../contexts/IdentityContext'
import { useSurvivabilityScore } from '../hooks/useSurvivabilityScore'
import { useDocs } from '../hooks/useDocs'
import { createDoc, updateDoc, approveDoc, archiveDoc } from '../lib/docs'
import { fetchTribeMeta } from '../lib/tribes'
import { getAuthority, hasAuthority, ROLE_REGISTRY } from '@plus-ultra/core'
import type { Tribe, TribeDoc, DocCategory } from '@plus-ultra/core'
import ReactMarkdown from 'react-markdown'

type Tab = 'browse' | 'drafts' | 'search' | 'templates'

const CATEGORY_LABELS: Record<DocCategory, string> = {
  medical: 'Medical',
  security: 'Security',
  food_water: 'Food & Water',
  comms: 'Comms',
  evacuation: 'Evacuation',
  governance: 'Governance',
  training: 'Training',
  other: 'Other',
}

const CATEGORY_COLORS: Record<DocCategory, string> = {
  medical: 'bg-red-900/40 text-red-300 border-red-800/50',
  security: 'bg-orange-900/40 text-orange-300 border-orange-800/50',
  food_water: 'bg-green-900/40 text-green-300 border-green-800/50',
  comms: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
  evacuation: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
  governance: 'bg-purple-900/40 text-purple-300 border-purple-800/50',
  training: 'bg-forest-900/40 text-forest-300 border-forest-800/50',
  other: 'bg-gray-800/40 text-gray-300 border-gray-700/50',
}

const TEMPLATES = [
  {
    label: 'Medical Emergency Checklist',
    category: 'medical' as DocCategory,
    content: '# Medical Emergency Checklist\n\n## Immediate Response\n- Ensure scene safety\n- Call for the tribe medic\n- Assess responsiveness (tap shoulders, call out)\n\n## Airway / Breathing / Circulation\n- Check airway — tilt head, lift chin\n- Look, listen, feel for breathing\n- Check for severe bleeding\n\n## Specific Emergencies\n### Cardiac Arrest\n- Begin CPR: 30 compressions, 2 breaths\n- Locate AED if available\n\n### Severe Bleeding\n- Apply direct pressure\n- Tourniquet if extremity, 2 inches above wound\n\n### Shock\n- Lay flat, elevate legs unless head/chest injury\n- Keep warm\n\n## Documentation\n- Record time of incident\n- Note medications given\n- Log responders present',
  },
  {
    label: 'Perimeter Breach Protocol',
    category: 'security' as DocCategory,
    content: '# Perimeter Breach Protocol\n\n## Immediate Actions\n1. Sound the alert (radio: "BREACH, BREACH, BREACH — [location]")\n2. All non-security personnel shelter in place\n3. QRF (Quick Reaction Force) deploys to breach point\n\n## Response Levels\n### Level 1 — Unknown Contact\n- Two-person team investigates\n- Maintain radio contact\n- Report every 2 minutes\n\n### Level 2 — Confirmed Hostile\n- Full security posture\n- Non-combatants to safe room\n- Initiate challenge protocol\n\n## Post-Incident\n- Muster all tribe members\n- Document breach point and time\n- Patch perimeter before stand-down',
  },
  {
    label: 'Bug-Out SOP',
    category: 'evacuation' as DocCategory,
    content: '# Bug-Out Standard Operating Procedure\n\n## Trigger Conditions\nSee active bug-out plan in the app for current trigger conditions.\n\n## Immediate Actions (first 10 minutes)\n1. Sound bug-out alert\n2. All members acknowledge via app or radio\n3. Vehicle drivers report to their assigned vehicles\n4. Load priorities 1–3 loaded first\n\n## Load Sequence\nFollow load priority list in the active bug-out plan.\n\n## Rally Points\nSee PACE plan for rally point coordinates.\n\n## If Separated\n- Go to primary rally point\n- Wait 2 hours\n- If no contact, proceed to secondary rally point\n- Check-in schedule: see PACE plan',
  },
  {
    label: 'PACE Plan SOP',
    category: 'comms' as DocCategory,
    content: '# PACE Communications SOP\n\n## When to Use Each Level\nSee active PACE plan in the app for current methods and frequencies.\n\n**Primary** — Use first, every time.\n**Alternate** — If primary fails after 2 attempts.\n**Contingency** — If alternate unreachable after 10 minutes.\n**Emergency** — Last resort. Assume compromised.\n\n## Check-In Procedure\n1. Announce callsign and tribe designation\n2. State status: GREEN (all well) / AMBER (issues) / RED (emergency)\n3. Receive acknowledgment before signing off\n\n## Missed Check-In\n- 1 missed check-in: attempt callback\n- 2 missed: escalate to next PACE level\n- 3 missed: initiate search protocol',
  },
  {
    label: 'All-Clear Procedure',
    category: 'security' as DocCategory,
    content: '# All-Clear Procedure\n\n## Conditions for All-Clear\n- Threat neutralized or departed\n- Perimeter re-secured and verified\n- All tribe members accounted for\n- Leadership consensus reached\n\n## Steps\n1. Senior leadership declares intent to stand down\n2. Final perimeter sweep by security team\n3. Muster all tribe members — verify headcount\n4. Medical check: any injuries requiring treatment?\n5. Broadcast all-clear via primary comms\n6. Log incident in tribe records\n\n## Return to Normal Operations\n- Security: return to standard watch rotation\n- Non-security: resume normal duties\n- Document: what happened, what worked, what to improve',
  },
]

interface DocFormState {
  title: string
  category: DocCategory
  content: string
  tags: string
  linkedRoles: string[]
}

const DEFAULT_FORM: DocFormState = {
  title: '',
  category: 'other',
  content: '',
  tags: '',
  linkedRoles: [],
}

function DocCard({
  doc,
  canManage,
  onApprove,
  onArchive,
  onEdit,
}: {
  doc: TribeDoc
  canManage: boolean
  onApprove: (docId: string) => void
  onArchive: (docId: string) => void
  onEdit: (doc: TribeDoc) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleExport() {
    await navigator.clipboard.writeText(doc.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-100 text-sm">{doc.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[doc.category]}`}>
                {CATEGORY_LABELS[doc.category]}
              </span>
              {doc.status === 'draft' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-warning-900/40 text-warning-300 border-warning-800/50">
                  draft
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              v{doc.version} · {new Date(doc.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <span className="text-forest-400 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-forest-800 pt-3 space-y-3">
          <div className="text-sm text-gray-300 leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-forest-900 [&_code]:px-1 [&_code]:rounded [&_p]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_strong]:text-gray-100">
            <ReactMarkdown>{doc.content}</ReactMarkdown>
          </div>
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.tags.map(t => (
                <span key={t} className="text-[10px] bg-forest-900 text-forest-400 px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="text-xs px-2 py-1 rounded bg-forest-800 text-forest-300 hover:bg-forest-700"
              onClick={handleExport}
            >
              {copied ? 'Copied!' : 'Export as text'}
            </button>
            {canManage && doc.status === 'draft' && (
              <button
                className="text-xs px-2 py-1 rounded bg-forest-700 text-forest-200 hover:bg-forest-600"
                onClick={() => onApprove(doc.id)}
              >
                Approve
              </button>
            )}
            {canManage && (
              <button
                className="text-xs px-2 py-1 rounded bg-forest-800 text-gray-300 hover:bg-forest-700"
                onClick={() => onEdit(doc)}
              >
                Edit
              </button>
            )}
            {canManage && doc.status !== 'archived' && (
              <button
                className="text-xs px-2 py-1 rounded bg-danger-900/40 text-danger-300 hover:bg-danger-900/60"
                onClick={() => onArchive(doc.id)}
              >
                Archive
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function KnowledgeBaseScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/kb' })
  const { identity } = useIdentity()
  const { members } = useSurvivabilityScore(tribeId)
  const { docs, loading, getActiveDocs, getDraftDocs } = useDocs(tribeId)
  const [tribe, setTribe] = useState<Tribe | null>(null)

  useEffect(() => {
    fetchTribeMeta(tribeId).then(t => { if (t) setTribe(t) })
  }, [tribeId])

  const myMember = identity ? members.find(m => m.pubkey === identity.pub) : undefined
  const myAuth = myMember && tribe ? getAuthority(myMember, tribe) : 'member'
  const canCreate = hasAuthority(myAuth, 'lead')
  const canManage = hasAuthority(myAuth, 'elder_council')

  const [tab, setTab] = useState<Tab>('browse')
  const [categoryFilter, setCategoryFilter] = useState<DocCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDoc, setEditingDoc] = useState<TribeDoc | null>(null)
  const [form, setForm] = useState<DocFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const activeDocs = getActiveDocs()
  const draftDocs = getDraftDocs()

  const browseDocs = categoryFilter === 'all'
    ? activeDocs
    : activeDocs.filter(d => d.category === categoryFilter)

  const myDrafts = draftDocs.filter(
    d => d.authorPub === identity?.pub || canManage
  )

  const searchResults = searchQuery.trim()
    ? docs.filter(d => {
        if (d.status === 'archived') return false
        const haystack = [d.title, d.content, ...(d.tags ?? [])].join(' ').toLowerCase()
        return haystack.includes(searchQuery.toLowerCase())
      })
    : []

  async function handleApprove(docId: string) {
    if (!identity) return
    await approveDoc(tribeId, docId, identity.pub)
  }

  async function handleArchive(docId: string) {
    await archiveDoc(tribeId, docId)
  }

  function handleEditDoc(doc: TribeDoc) {
    setEditingDoc(doc)
    setForm({
      title: doc.title,
      category: doc.category,
      content: doc.content,
      tags: (doc.tags ?? []).join(', '),
      linkedRoles: doc.linkedRoles ?? [],
    })
    setShowForm(true)
  }

  function handleNewDoc(prefill?: Partial<DocFormState>) {
    setEditingDoc(null)
    setForm({ ...DEFAULT_FORM, ...prefill })
    setShowForm(true)
  }

  async function handleSave(andApprove = false) {
    if (!identity || !form.title.trim()) return
    setSaving(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      if (editingDoc) {
        await updateDoc(tribeId, editingDoc.id, {
          title: form.title,
          category: form.category,
          content: form.content,
          tags,
          linkedRoles: form.linkedRoles,
        })
        if (andApprove) await approveDoc(tribeId, editingDoc.id, identity.pub)
      } else {
        const id = await createDoc(tribeId, {
          title: form.title,
          category: form.category,
          content: form.content,
          tags,
          linkedRoles: form.linkedRoles,
        }, identity.pub)
        if (andApprove) await approveDoc(tribeId, id, identity.pub)
      }
      setShowForm(false)
      setEditingDoc(null)
      setForm(DEFAULT_FORM)
    } finally {
      setSaving(false)
    }
  }

  const categories = Object.keys(CATEGORY_LABELS) as DocCategory[]

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
        <h2 className="text-xl font-bold text-gray-100">Knowledge Base</h2>
        {(canCreate || canManage) && (
          <button
            className="btn-primary text-sm"
            onClick={() => handleNewDoc()}
          >
            + New Doc
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-forest-900/50 p-1 rounded-lg">
        {(['browse', 'drafts', 'search', 'templates'] as Tab[]).map(t => (
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

      {/* Inline form */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-200">
            {editingDoc ? 'Edit Document' : 'New Document'}
          </h3>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Title *</label>
            <input
              className="input w-full"
              placeholder="Document title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Category</label>
            <select
              className="input w-full"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as DocCategory }))}
            >
              {categories.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Content (Markdown supported)</label>
            <textarea
              className="input w-full font-mono text-xs"
              rows={12}
              placeholder="Write your SOP or playbook here using Markdown..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tags (comma-separated)</label>
            <input
              className="input w-full"
              placeholder="e.g. emergency, first-aid"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Linked Roles</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_REGISTRY.map(role => (
                <button
                  key={role.role}
                  type="button"
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    form.linkedRoles.includes(role.role)
                      ? 'bg-forest-700 border-forest-500 text-forest-200'
                      : 'bg-forest-900 border-forest-700 text-gray-400 hover:border-forest-600'
                  }`}
                  onClick={() => setForm(f => ({
                    ...f,
                    linkedRoles: f.linkedRoles.includes(role.role)
                      ? f.linkedRoles.filter(r => r !== role.role)
                      : [...f.linkedRoles, role.role],
                  }))}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1 text-sm"
              onClick={() => handleSave(false)}
              disabled={saving || !form.title.trim()}
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            {canManage && (
              <button
                className="btn-primary flex-1 text-sm bg-forest-600 hover:bg-forest-500"
                onClick={() => handleSave(true)}
                disabled={saving || !form.title.trim()}
              >
                Save &amp; Approve
              </button>
            )}
            <button
              className="btn-secondary text-sm"
              onClick={() => { setShowForm(false); setEditingDoc(null); setForm(DEFAULT_FORM) }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Browse tab */}
      {tab === 'browse' && (
        <div className="space-y-3">
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-forest-700 border-forest-500 text-forest-200'
                  : 'bg-forest-900 border-forest-700 text-gray-400'
              }`}
              onClick={() => setCategoryFilter('all')}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  categoryFilter === c
                    ? 'bg-forest-700 border-forest-500 text-forest-200'
                    : 'bg-forest-900 border-forest-700 text-gray-400'
                }`}
                onClick={() => setCategoryFilter(c)}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8 text-forest-400 text-sm animate-pulse">Loading docs...</div>
          ) : browseDocs.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">No approved documents yet</p>
              <p className="text-gray-500 text-xs mt-1">Use Templates to get started quickly</p>
            </div>
          ) : (
            browseDocs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                canManage={canManage}
                onApprove={handleApprove}
                onArchive={handleArchive}
                onEdit={handleEditDoc}
              />
            ))
          )}
        </div>
      )}

      {/* Drafts tab */}
      {tab === 'drafts' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-forest-400 text-sm animate-pulse">Loading...</div>
          ) : myDrafts.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">No drafts</p>
            </div>
          ) : (
            myDrafts.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                canManage={canManage}
                onApprove={handleApprove}
                onArchive={handleArchive}
                onEdit={handleEditDoc}
              />
            ))
          )}
        </div>
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <div className="space-y-3">
          <input
            className="input w-full"
            placeholder="Search titles, content, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery.trim() === '' ? (
            <p className="text-gray-500 text-sm text-center py-4">Type to search</p>
          ) : searchResults.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No results</p>
          ) : (
            searchResults.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                canManage={canManage}
                onApprove={handleApprove}
                onArchive={handleArchive}
                onEdit={handleEditDoc}
              />
            ))
          )}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Start from a template — opens the form pre-filled for editing before saving.
          </p>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.label}
              className="w-full card text-left hover:border-forest-600 transition-colors"
              onClick={() => {
                handleNewDoc({ title: tpl.label, category: tpl.category, content: tpl.content })
                setTab('browse')
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-200">{tpl.label}</div>
                  <div className={`text-[10px] mt-0.5 inline-block px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[tpl.category]}`}>
                    {CATEGORY_LABELS[tpl.category]}
                  </div>
                </div>
                <span className="text-forest-400">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
