import { useAuthActions } from '@convex-dev/auth/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import { Button } from '@mantine/core'

export function Navbar() {
  const { signIn, signOut } = useAuthActions()
  const { data: user } = useSuspenseQuery(
    convexQuery(api.authFns.currentUser, {}),
  )

  return (
    <nav
      style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>My App</div>
      <div>
        {user.isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Welcome, {user.name}</span>
            <Button onClick={() => void signOut()}>Sign Out</Button>
          </div>
        ) : (
          <Button onClick={() => void signIn('github')}>Sign In</Button>
        )}
      </div>
    </nav>
  )
}
