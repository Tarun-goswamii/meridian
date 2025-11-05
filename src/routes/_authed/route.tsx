import { api } from '@/convex/_generated/api'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import Loading from '~/components/Loading'
import Login from '~/components/Login'

export const Route = createFileRoute('/_authed')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: user } = useSuspenseQuery(
    convexQuery(api.authFns.currentUser, {}),
  )

  if (!user) return <Loading />

  return user.isAuthenticated ? <Outlet /> : <Login />
}
