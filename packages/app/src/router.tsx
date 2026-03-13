import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { IdentityProvider } from './contexts/IdentityContext'
import { TribeProvider } from './contexts/TribeContext'
import IdentityScreen from './screens/IdentityScreen'
import HomeScreen from './screens/HomeScreen'
import CreateTribeScreen from './screens/CreateTribeScreen'
import JoinTribeScreen from './screens/JoinTribeScreen'
import TribeDashboard from './screens/TribeDashboard'
import SkillsDeclarationScreen from './screens/SkillsDeclarationScreen'
import TribeChannelScreen from './screens/TribeChannelScreen'
import DirectMessageScreen from './screens/DirectMessageScreen'
import DiagnosticsScreen from './screens/DiagnosticsScreen'
import TribeSchematicScreen from './screens/TribeSchematicScreen'
import MyStationScreen from './screens/MyStationScreen'
import MyPeopleScreen from './screens/MyPeopleScreen'
import ScheduleScreen from './screens/ScheduleScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import InventoryScreen from './screens/InventoryScreen'
import MemberProfileScreen from './screens/MemberProfileScreen'
import TribeSettingsScreen from './screens/TribeSettingsScreen'
import ProposalsScreen from './screens/ProposalsScreen'
import CreateProposalScreen from './screens/CreateProposalScreen'
import ProposalDetailScreen from './screens/ProposalDetailScreen'
import MapScreen from './screens/MapScreen'

function RootLayout() {
  return (
    <IdentityProvider>
      <TribeProvider>
        <div className="min-h-screen bg-forest-950">
          <Outlet />
        </div>
      </TribeProvider>
    </IdentityProvider>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeScreen,
})

const identityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/identity',
  component: IdentityScreen,
})

const createTribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create-tribe',
  component: CreateTribeScreen,
})

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join',
  component: JoinTribeScreen,
})

const tribeDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId',
  component: TribeDashboard,
})

const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/skills',
  component: SkillsDeclarationScreen,
})

const tribeChannelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/channel',
  component: TribeChannelScreen,
})

const dmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/dm/$memberPub',
  component: DirectMessageScreen,
})

const tribeSchematicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/schematic',
  component: TribeSchematicScreen,
})

const myStationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/station',
  component: MyStationScreen,
})

const myPeopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/people',
  component: MyPeopleScreen,
})

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/schedule',
  component: ScheduleScreen,
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/onboarding',
  component: OnboardingScreen,
})

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/inventory',
  component: InventoryScreen,
})

const memberProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/member/$memberPub',
  component: MemberProfileScreen,
})

const tribeSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/settings',
  component: TribeSettingsScreen,
})

const proposalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/proposals',
  component: ProposalsScreen,
})

// IMPORTANT: createProposalRoute must come before proposalDetailRoute
// so that "new" is not captured as $proposalId
const createProposalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/proposals/new',
  component: CreateProposalScreen,
})

const proposalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/proposals/$proposalId',
  component: ProposalDetailScreen,
})

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tribe/$tribeId/map',
  component: MapScreen,
})

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/diagnostics',
  component: DiagnosticsScreen,
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  identityRoute,
  createTribeRoute,
  joinRoute,
  tribeDashboardRoute,
  skillsRoute,
  tribeChannelRoute,
  dmRoute,
  tribeSchematicRoute,
  myStationRoute,
  myPeopleRoute,
  scheduleRoute,
  onboardingRoute,
  inventoryRoute,
  memberProfileRoute,
  tribeSettingsRoute,
  proposalsRoute,
  createProposalRoute,
  proposalDetailRoute,
  mapRoute,
  diagnosticsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
