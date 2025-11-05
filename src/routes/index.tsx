import { createFileRoute, Link } from '@tanstack/react-router'
// import { queryDatabase } from '~/utils/duckdb'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  beforeLoad: () => {
    // queryDatabase({ data: 'SELECT * FROM file1' })
  },
})

function RouteComponent() {
  return (
    <div>
      <h1>Hello "/"!</h1>
      <Link to="/dashboard">Dashboard</Link>
    </div>
  )
}
