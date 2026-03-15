import type { Notification } from '../lib/notifications'

const TYPE_ICONS: Record<string, string> = {
  event_starting: '⏰',
  event_assigned: '📋',
  alert_broadcast: '🚨',
  muster_called: '📣',
  role_change: '⚙️',
  new_member: '👋',
  vouch_received: '👍',
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

interface Props {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}

export default function NotificationsPanel({ notifications, onMarkRead, onMarkAllRead, onClose }: Props) {
  const unread = notifications.filter(n => !n.read)

  return (
    <div className="card border-forest-700 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">Notifications</h3>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button
              className="text-xs text-forest-400 hover:text-forest-300"
              onClick={onMarkAllRead}
            >
              Mark all read
            </button>
          )}
          <button className="text-gray-500 hover:text-gray-300 text-sm" onClick={onClose}>✕</button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No notifications yet</p>
      ) : (
        <div className="space-y-1">
          {notifications.slice(0, 50).map(n => (
            <button
              key={n.id}
              className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2 ${
                n.read
                  ? 'bg-transparent hover:bg-forest-900/30'
                  : 'bg-forest-900/50 hover:bg-forest-900/70'
              }`}
              onClick={() => { if (!n.read) onMarkRead(n.id) }}
            >
              <span className="text-base flex-shrink-0 mt-0.5">
                {TYPE_ICONS[n.type] ?? '📌'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold truncate ${n.read ? 'text-gray-400' : 'text-gray-100'}`}>
                    {n.title}
                  </span>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-forest-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{n.body}</p>
                <span className="text-xs text-gray-600">{timeAgo(n.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
