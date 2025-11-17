import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { AutumnProvider } from 'autumn-js/react'
import PRESENCE_CSS from '@convex-dev/presence/facepile.css?url'
import { Navbar } from '@/src/components/Navbar'
import { Footer } from '@/src/components/Footer'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dropzone/styles.css'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Meridian - Collaborative Data Science Platform',
      },
    ],
    links: [
      { rel: 'stylesheet', href: PRESENCE_CSS },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/logo.png',
      },
    ],
    styles: [{ children: PRESENCE_CSS }],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
})

function RootComponent() {
  const location = useLocation()
  const isAuthedRoute =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/table/')

  return (
    <RootDocument>
      {!isAuthedRoute ? <Navbar /> : <Navbar authed={true} />}
      <Outlet />
      {!isAuthedRoute && <Footer />}
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <MantineProvider>
          <AutumnProvider>
            <Notifications />
            {children}
          </AutumnProvider>
        </MantineProvider>

        <Scripts />
      </body>
    </html>
  )
}
