import { Link, useRouterState } from '@tanstack/react-router'
import { useChannelUnread } from '../hooks/useChannelUnread'
import AppIcon, { type AppIconName } from './AppIcon'

interface Tab {
  key: string
  label: string
  icon: AppIconName
  to: string
  match: (pathname: string, base: string) => boolean
}

const TABS: Tab[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    to: '/tribe/$tribeId',
    match: (p, base) => p === base,
  },
  {
    key: 'chat',
    label: 'Chat',
    icon: 'chat',
    to: '/tribe/$tribeId/channel',
    match: (p, base) => p.startsWith(`${base}/channel`) || p.includes('/dm/'),
  },
  {
    key: 'people',
    label: 'People',
    icon: 'people',
    to: '/tribe/$tribeId/people',
    match: (p, base) =>
      p.startsWith(`${base}/people`) || p.startsWith(`${base}/member/`),
  },
  {
    key: 'map',
    label: 'Map',
    icon: 'map',
    to: '/tribe/$tribeId/map',
    match: (p, base) => p.startsWith(`${base}/map`),
  },
  {
    key: 'more',
    label: 'More',
    icon: 'menu',
    to: '/tribe/$tribeId/more',
    match: (p, base) =>
      p.startsWith(`${base}/more`) ||
      (!TABS.slice(0, 4).some((t) => t.match(p, base)) && p !== base),
  },
]

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute top-1 right-1/2 translate-x-4 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  )
}

/**
 * Bottom tab bar for all tribe screens (rendered by TribeLayout).
 * Thumb-friendly: 5 tabs, 44pt+ targets, safe-area aware.
 */
export default function TribeTabBar({ tribeId }: { tribeId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const base = `/tribe/${tribeId}`
  const unread = useChannelUnread('tribe-wide')

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-forest-950/95 backdrop-blur border-t border-forest-800 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname, base)
          return (
            <Link
              key={tab.key}
              to={tab.to}
              params={{ tribeId }}
              className={`relative flex flex-col items-center justify-center gap-0.5 h-14 transition-colors ${
                active ? 'text-accent-400' : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <AppIcon name={tab.icon} size={22} weight={active ? 'fill' : 'regular'} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
              {tab.key === 'chat' && <Badge count={unread} />}
              {active && <span className="absolute top-0 w-8 h-0.5 rounded bg-accent-500" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
