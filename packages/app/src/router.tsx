import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { IdentityProvider } from './contexts/IdentityContext'
import { TribeProvider } from './contexts/TribeContext'
import TribeLayout from './components/TribeLayout'
import IdentityScreen from './screens/IdentityScreen'
import HomeScreen from './screens/HomeScreen'
import CreateTribeScreen from './screens/CreateTribeScreen'
import JoinTribeScreen from './screens/JoinTribeScreen'
import TribeDashboard from './screens/TribeDashboard'
import SkillsDeclarationScreen from './screens/SkillsDeclarationScreen'
import TribeChannelScreen from './screens/TribeChannelScreen'
import DirectMessageScreen from './screens/DirectMessageScreen'
import DiagnosticsScreen from './screens/DiagnosticsScreen'
import DesignSystemScreen from './screens/DesignSystemScreen'
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
import TrainingScreen from './screens/TrainingScreen'
import ConnectScreen from './screens/ConnectScreen'
import FederationScreen from './screens/FederationScreen'
import FederationChannelScreen from './screens/FederationChannelScreen'
import PsychOverviewScreen from './screens/PsychOverviewScreen'
import PsychAssessmentScreen from './screens/PsychAssessmentScreen'
import RollCallScreen from './screens/RollCallScreen'
import ProductionScreen from './screens/ProductionScreen'
import ContactsScreen from './screens/ContactsScreen'
import CommsScreen from './screens/CommsScreen'
import GoalsScreen from './screens/GoalsScreen'
import BugOutScreen from './screens/BugOutScreen'
import KnowledgeBaseScreen from './screens/KnowledgeBaseScreen'
import FinanceScreen from './screens/FinanceScreen'
import ReadinessScreen from './screens/ReadinessScreen'
import MoreScreen from './screens/MoreScreen'
import Viewer from './viewer/Viewer'

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

// Layout for the /tribe URL space: page content + bottom tab bar.
// The layout owns the 'tribe' prefix; children paths are relative to it,
// so full paths stay exactly '/tribe/$tribeId/...' as before.
const tribeLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'tribe',
  component: TribeLayout,
})

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
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId',
  component: TribeDashboard,
})

const skillsRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/skills',
  component: SkillsDeclarationScreen,
})

const tribeChannelRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/channel',
  component: TribeChannelScreen,
})

const dmRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/dm/$memberPub',
  component: DirectMessageScreen,
})

const tribeSchematicRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/schematic',
  component: TribeSchematicScreen,
})

const myStationRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/station',
  component: MyStationScreen,
})

const myPeopleRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/people',
  component: MyPeopleScreen,
})

const scheduleRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/schedule',
  component: ScheduleScreen,
})

const onboardingRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/onboarding',
  component: OnboardingScreen,
})

const inventoryRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/inventory',
  component: InventoryScreen,
})

const memberProfileRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/member/$memberPub',
  component: MemberProfileScreen,
})

const tribeSettingsRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/settings',
  component: TribeSettingsScreen,
})

const proposalsRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/proposals',
  component: ProposalsScreen,
})

// IMPORTANT: createProposalRoute must come before proposalDetailRoute
// so that "new" is not captured as $proposalId
const createProposalRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/proposals/new',
  component: CreateProposalScreen,
})

const proposalDetailRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/proposals/$proposalId',
  component: ProposalDetailScreen,
})

const mapRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/map',
  component: MapScreen,
})

const trainingRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/training',
  component: TrainingScreen,
})

const connectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/connect',
  component: ConnectScreen,
})

const federationRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/federation',
  component: FederationScreen,
})

// IMPORTANT: federationChannelRoute must come after federationRoute
const federationChannelRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/federation/$channelId',
  component: FederationChannelScreen,
})

const psychOverviewRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/psych',
  component: PsychOverviewScreen,
})

// IMPORTANT: psychAssessmentRoute must come after psychOverviewRoute
const psychAssessmentRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/psych/assessment',
  component: PsychAssessmentScreen,
})

const rollCallRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/rollcall',
  component: RollCallScreen,
})

const productionRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/production',
  component: ProductionScreen,
})

const contactsRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/contacts',
  component: ContactsScreen,
})

const commsRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/comms',
  component: CommsScreen,
})

const goalsRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/goals',
  component: GoalsScreen,
})

const bugoutRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/bugout',
  component: BugOutScreen,
})

const kbRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/kb',
  component: KnowledgeBaseScreen,
})

const financeRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/finance',
  component: FinanceScreen,
})

const readinessRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/readiness',
  component: ReadinessScreen,
})

const moreRoute = createRoute({
  getParentRoute: () => tribeLayoutRoute,
  path: '$tribeId/more',
  component: MoreScreen,
})

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/diagnostics',
  component: DiagnosticsScreen,
})

const designSystemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/design-system',
  component: DesignSystemScreen,
})

const viewerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/viewer',
  component: Viewer,
})

// Individual flow routes: /$sectionSlug/$flowSlug
// e.g. /setup-and-identity/onboarding-wizard
const viewerFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$sectionSlug/$flowSlug',
  component: Viewer,
})

const tribeRouteTree = tribeLayoutRoute.addChildren([
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
  trainingRoute,
  federationRoute,
  federationChannelRoute,
  psychOverviewRoute,
  psychAssessmentRoute,
  rollCallRoute,
  productionRoute,
  contactsRoute,
  commsRoute,
  goalsRoute,
  bugoutRoute,
  kbRoute,
  financeRoute,
  readinessRoute,
  moreRoute,
])

const routeTree = rootRoute.addChildren([
  homeRoute,
  identityRoute,
  createTribeRoute,
  joinRoute,
  tribeRouteTree,
  connectRoute,
  diagnosticsRoute,
  designSystemRoute,
  viewerRoute,
  viewerFlowRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
