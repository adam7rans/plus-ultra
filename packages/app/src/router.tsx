import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { IdentityProvider } from './contexts/IdentityContext'
import IdentityScreen from './screens/IdentityScreen'
import HomeScreen from './screens/HomeScreen'

function RootLayout() {
  return (
    <IdentityProvider>
      <div className="min-h-screen bg-forest-950">
        <Outlet />
      </div>
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

const routeTree = rootRoute.addChildren([homeRoute, identityRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
