import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { IdentityProvider } from './contexts/IdentityContext'
import { TribeProvider } from './contexts/TribeContext'
import IdentityScreen from './screens/IdentityScreen'
import HomeScreen from './screens/HomeScreen'
import CreateTribeScreen from './screens/CreateTribeScreen'
import JoinTribeScreen from './screens/JoinTribeScreen'
import TribeDashboard from './screens/TribeDashboard'
import SkillsDeclarationScreen from './screens/SkillsDeclarationScreen'

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

const routeTree = rootRoute.addChildren([
  homeRoute,
  identityRoute,
  createTribeRoute,
  joinRoute,
  tribeDashboardRoute,
  skillsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
