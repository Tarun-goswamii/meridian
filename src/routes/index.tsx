import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

async function RouteComponent() {
  return (
    <div>
      <h1>Hello "/"!</h1>
      <Link to="/dashboard">Dashboard</Link>
    </div>
  )
}
