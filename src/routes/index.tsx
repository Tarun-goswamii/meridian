import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/src/components/Navbar'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <Navbar />
      <main style={{ padding: '2rem' }}>
        <h1
          style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}
        >
          Welcome to My App
        </h1>
        <p>
          This is a simple TanStack Start + Convex + Convex Auth application.
        </p>
      </main>
    </div>
  )
}
