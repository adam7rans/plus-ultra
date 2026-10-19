import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import AppIcon, { type AppIconName } from '../components/AppIcon'
import {
  AppButton, AppCard, AppField, AppInput, AppTextarea, AppSelect,
  AppBadge, AppModal, AppEmptyState, AppListRow, AppSegmented,
} from '../components/ui'
import { ICON_NAMES } from './designSystemIcons'

function Section({ title, body, children }: {
  title: string; body?: string; children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-gray-100 mb-1">{title}</h2>
      {body && <p className="text-xs text-gray-500 mb-3">{body}</p>}
      <AppCard>{children}</AppCard>
    </section>
  )
}

export default function DesignSystemScreen() {
  const [seg, setSeg] = useState<'all' | 'active' | 'past'>('all')
  const [showModal, setShowModal] = useState(false)
  const [iconFilter, setIconFilter] = useState('')
  const icons = ICON_NAMES.filter((n) =>
    n.toLowerCase().includes(iconFilter.toLowerCase()))

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-16">
      <Link to="/" className="text-forest-400 text-sm mb-6 flex items-center gap-2 hover:text-forest-300">
        ← Home
      </Link>
      <h1 className="text-xl font-bold text-gray-100">Design System</h1>
      <p className="text-xs text-gray-500 mt-1 mb-6">
        Every shared primitive in <span className="font-mono">src/components/ui</span> + AppIcon.
        If you build UI with anything else, it belongs here first.
      </p>

      <Section title="AppButton" body="primary / secondary / danger / ghost / icon × sm / md / lg + fullWidth, loading, disabled">
        <div className="flex flex-wrap gap-2 mb-3">
          <AppButton size="sm">Primary</AppButton>
          <AppButton size="sm" variant="secondary">Secondary</AppButton>
          <AppButton size="sm" variant="danger">Danger</AppButton>
          <AppButton size="sm" variant="ghost">Ghost</AppButton>
          <AppButton size="sm" variant="icon" icon="close" aria-label="Close" />
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <AppButton size="sm" icon="plus">Small</AppButton>
          <AppButton icon="check">Medium</AppButton>
          <AppButton size="lg" icon="check">Large</AppButton>
        </div>
        <div className="space-y-2">
          <AppButton fullWidth icon="plus">Full-width CTA</AppButton>
          <AppButton fullWidth loading>Loading state</AppButton>
          <AppButton fullWidth disabled>Disabled state</AppButton>
        </div>
      </Section>

      <Section title="AppCard" body="Standard surface. Same look as legacy .card.">
        <p className="text-sm text-gray-300">Cards hold one idea: a title, a line of body, and actions.</p>
        <p className="text-xs text-gray-500 mt-1">Pass className with ! overrides only for state borders.</p>
      </Section>

      <Section title="AppField + inputs" body="Label + control + hint / error.">
        <div className="space-y-3">
          <AppField label="Name" required hint="Shown on your member card.">
            <AppInput placeholder="Ada Rans" />
          </AppField>
          <AppField label="Notes" hint="Textarea grows with content.">
            <AppTextarea rows={2} placeholder="Anything the tribe should know…" />
          </AppField>
          <AppField label="Role" error="Pick one to continue.">
            <AppSelect defaultValue="">
              <option value="" disabled>Choose…</option>
              <option>Medic</option>
              <option>Scout</option>
            </AppSelect>
          </AppField>
        </div>
      </Section>

      <Section title="AppBadge" body="Counts, statuses, tags.">
        <div className="flex flex-wrap gap-2">
          <AppBadge>neutral</AppBadge>
          <AppBadge tone="green">green</AppBadge>
          <AppBadge tone="red">red</AppBadge>
          <AppBadge tone="amber">amber</AppBadge>
          <AppBadge tone="gray">gray</AppBadge>
        </div>
      </Section>

      <Section title="AppSegmented" body="Single-select pill group. Interactive:">
        <AppSegmented options={['all', 'active', 'past'] as const} value={seg} onChange={setSeg} />
        <p className="text-xs text-gray-500 mt-2">Selected: <span className="font-mono">{seg}</span></p>
      </Section>

      <Section title="AppListRow" body="Icon + title + blurb disclosure row (More-screen pattern).">
        <div className="border border-forest-800 rounded-lg overflow-hidden divide-y divide-forest-800">
          <AppListRow icon="people" title="Members" blurb="25 in tribe" to="/" />
          <AppListRow icon="settings" title="Settings" blurb="Name, location, danger zone" onClick={() => {}} />
        </div>
      </Section>

      <Section title="AppEmptyState" body="Empty lists: icon + title + body + action.">
        <AppEmptyState icon="calendar" title="No events yet" body="Schedule the first muster to get going." action={<AppButton size="sm" icon="plus">New event</AppButton>} />
      </Section>

      <Section title="AppModal" body="Centered dialog. Backdrop tap does not dismiss.">
        <AppButton variant="secondary" size="sm" onClick={() => setShowModal(true)}>Open demo modal</AppButton>
        {showModal && (
          <AppModal title="Call Muster" icon="megaphone" onClose={() => setShowModal(false)}>
            <p className="text-sm text-gray-300 mb-3">This is the shared modal shell. Actions go below.</p>
            <AppButton fullWidth onClick={() => setShowModal(false)}>Got it</AppButton>
          </AppModal>
        )}
      </Section>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-100 mb-1">AppIcon — {ICON_NAMES.length} names</h2>
        <p className="text-xs text-gray-500 mb-3">Phosphor under the hood. Search, then use <span className="font-mono">&lt;AppIcon name="…"/&gt;</span>.</p>
        <AppCard>
          <AppInput value={iconFilter} onChange={(e) => setIconFilter(e.target.value)} placeholder="Filter icons…" className="mb-3" />
          <div className="grid grid-cols-6 gap-1 max-h-96 overflow-y-auto">
            {icons.map((n: AppIconName) => (
              <div key={n} className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-forest-800" title={n}>
                <AppIcon name={n} size={20} />
                <span className="text-[9px] text-gray-500 truncate max-w-full px-1">{n}</span>
              </div>
            ))}
          </div>
          {icons.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No icons match “{iconFilter}”.</p>}
        </AppCard>
      </section>

      <Section title="TribeTabBar" body="Bottom tabs (Home / Chat / People / Map / More) render in TribeLayout on every /tribe/* screen. Not previewed here — open any tribe to see it.">
        <p className="text-xs text-gray-500">Source: <span className="font-mono">src/components/TribeTabBar.tsx</span></p>
      </Section>
    </div>
  )
}

