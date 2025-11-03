import { useAuthActions } from '@convex-dev/auth/react'
import { Container, Button, Title } from '@mantine/core'
import { IconBrandGithub } from '@tabler/icons-react'

export default function Login() {
  const { signIn } = useAuthActions()
  return (
    <Container size={420} my={80}>
      <Title ta="center" style={{ fontWeight: 900 }}>
        Sign in to an account
      </Title>
      <Button
        fullWidth
        mt={40}
        onClick={() => void signIn('github', { redirectTo: '/dashboard' })}
      >
        <IconBrandGithub />
        Sign in with GitHub
      </Button>
    </Container>
  )
}
