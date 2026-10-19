import { Outlet, useParams, useRouterState } from '@tanstack/react-router'
import TribeTabBar from './TribeTabBar'

/**
 * Layout for every /tribe/* screen: page content + persistent bottom tab bar.
 * The onboarding wizard hides the bar (focused flow, no thumb nav yet).
 */
export default function TribeLayout() {
  const { tribeId } = useParams({ strict: false })
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isOnboarding = pathname.endsWith('/onboarding')

  return (
    <div className="min-h-screen bg-forest-950">
      {/* Bottom pad exactly matches the fixed tab bar (56px + home indicator)
          so scrolled content clears it with no dead space. Full-height
          screens (channel/DM) size themselves against the same formula. */}
      <div className={isOnboarding || !tribeId ? '' : 'pb-[calc(56px+env(safe-area-inset-bottom))]'}>
        <Outlet />
      </div>
      {!isOnboarding && tribeId && <TribeTabBar tribeId={tribeId} />}
    </div>
  )
}
