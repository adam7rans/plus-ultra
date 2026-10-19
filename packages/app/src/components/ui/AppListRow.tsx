import { Link } from '@tanstack/react-router'
import AppIcon, { type AppIconName } from '../AppIcon'

interface Base {
  icon: AppIconName
  title: string
  blurb?: string
  iconSize?: number
}

type Props = Base &
  (
    | { to: string; params?: Record<string, string>; onClick?: never }
    | { to?: never; params?: never; onClick: () => void }
  )

/**
 * AppListRow — icon + title + blurb disclosure row (the More-screen pattern).
 * Renders a Link when `to` is given, otherwise a button.
 */
export default function AppListRow(props: Props) {
  const inner = (
    <>
      <span className="flex-shrink-0 text-gray-300">
        <AppIcon name={props.icon} size={props.iconSize ?? 20} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block font-semibold text-gray-100 text-sm">{props.title}</span>
        {props.blurb && (
          <span className="block text-xs text-gray-500 truncate">{props.blurb}</span>
        )}
      </span>
      <span className="text-gray-600 flex-shrink-0">→</span>
    </>
  )
  const cls =
    'flex items-center gap-3 px-4 py-3 hover:bg-forest-800 transition-colors w-full'
  if (props.to) {
    // Route params are all strings at this boundary. The casts keep this
    // generic over every destination; TanStack resolves them at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const to = props.to as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params = props.params as any
    return (
      <Link to={to} params={params} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={props.onClick} className={cls}>
      {inner}
    </button>
  )
}
