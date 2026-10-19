import { useParams } from '@tanstack/react-router'
import { useTribe } from '../contexts/TribeContext'
import AppListRow from '../components/ui/AppListRow'
import type { AppIconName } from '../components/AppIcon'

interface Entry {
  to: TribePath
  icon: AppIconName
  title: string
  blurb: string
}

type TribePath =
  | '/tribe/$tribeId/schedule'
  | '/tribe/$tribeId/rollcall'
  | '/tribe/$tribeId/comms'
  | '/tribe/$tribeId/production'
  | '/tribe/$tribeId/bugout'
  | '/tribe/$tribeId/readiness'
  | '/tribe/$tribeId/station'
  | '/tribe/$tribeId/skills'
  | '/tribe/$tribeId/training'
  | '/tribe/$tribeId/psych'
  | '/tribe/$tribeId/contacts'
  | '/tribe/$tribeId/schematic'
  | '/tribe/$tribeId/proposals'
  | '/tribe/$tribeId/federation'
  | '/tribe/$tribeId/goals'
  | '/tribe/$tribeId/kb'
  | '/tribe/$tribeId/inventory'
  | '/tribe/$tribeId/finance'
  | '/tribe/$tribeId/settings'

interface Group {
  heading: string
  entries: Entry[]
}

// Every tribe destination reachable from the tab bar's More tab.
// Tab-level screens (Home, Chat, People, Map) are intentionally omitted.
const GROUPS: Group[] = [
  {
    heading: 'Operate',
    entries: [
      { to: '/tribe/$tribeId/schedule', icon: 'calendar', title: 'Schedule', blurb: 'Events and shifts' },
      { to: '/tribe/$tribeId/rollcall', icon: 'megaphone', title: 'Roll Call', blurb: 'Musters and responses' },
      { to: '/tribe/$tribeId/comms', icon: 'radio', title: 'Comms Plan', blurb: 'PACE, check-ins, rally points' },
      { to: '/tribe/$tribeId/production', icon: 'factory', title: 'Production', blurb: 'Food, water, energy output' },
      { to: '/tribe/$tribeId/bugout', icon: 'backpack', title: 'Bug-Out Plan', blurb: 'Evacuation plans and load' },
      { to: '/tribe/$tribeId/readiness', icon: 'shield', title: 'Readiness', blurb: 'Composite readiness score' },
    ],
  },
  {
    heading: 'Tribe',
    entries: [
      { to: '/tribe/$tribeId/station', icon: 'broadcast', title: 'My Station', blurb: 'Your inventory and priorities' },
      { to: '/tribe/$tribeId/skills', icon: 'toolbox', title: 'Skills', blurb: 'Declare and vouch skills' },
      { to: '/tribe/$tribeId/training', icon: 'graduation', title: 'Training', blurb: 'Sessions and certifications' },
      { to: '/tribe/$tribeId/psych', icon: 'brain', title: 'Psychology', blurb: 'Profiles and assessments' },
      { to: '/tribe/$tribeId/contacts', icon: 'contacts', title: 'Contacts', blurb: 'Doctors, HAM ops, vendors' },
      { to: '/tribe/$tribeId/schematic', icon: 'flow', title: 'Schematic', blurb: 'Roles, resources, readiness' },
    ],
  },
  {
    heading: 'Decide & Plan',
    entries: [
      { to: '/tribe/$tribeId/proposals', icon: 'checkSquare', title: 'Proposals', blurb: 'Decisions and governance' },
      { to: '/tribe/$tribeId/federation', icon: 'handshake', title: 'Federation', blurb: 'Inter-tribe contacts' },
      { to: '/tribe/$tribeId/goals', icon: 'target', title: 'Goals & Tasks', blurb: 'Objectives and action items' },
      { to: '/tribe/$tribeId/kb', icon: 'book', title: 'Knowledge Base', blurb: 'SOPs and protocols' },
      { to: '/tribe/$tribeId/inventory', icon: 'box', title: 'Inventory', blurb: 'Track assets and supplies' },
      { to: '/tribe/$tribeId/finance', icon: 'money', title: 'Finances', blurb: 'Shared expenses and funds' },
    ],
  },
  {
    heading: 'System',
    entries: [
      { to: '/tribe/$tribeId/settings', icon: 'settings', title: 'Tribe Settings', blurb: 'Name, roles, members' },
    ],
  },
]

export default function MoreScreen() {
  const { tribeId } = useParams({ from: '/tribe/$tribeId/more' })
  const { myTribes } = useTribe()
  const tribeName = myTribes.find((t) => t.tribeId === tribeId)?.name ?? 'Tribe'

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-100">{tribeName}</h2>
      <p className="text-gray-400 text-sm mt-0.5 mb-6">All sections</p>

      {GROUPS.map((group) => (
        <div key={group.heading} className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            {group.heading}
          </h3>
          <div className="card !p-0 overflow-hidden">
            {group.entries.map((entry, i) => (
              <div key={entry.to} className={i > 0 ? 'border-t border-forest-800' : ''}>
                <AppListRow
                  to={entry.to}
                  params={{ tribeId }}
                  icon={entry.icon}
                  title={entry.title}
                  blurb={entry.blurb}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
        Device
      </h3>
      <div className="card !p-0 overflow-hidden">
        <AppListRow
          to="/diagnostics"
          icon="stethoscope"
          title="Diagnostics"
          blurb="Device and sync status"
        />
      </div>
    </div>
  )
}
