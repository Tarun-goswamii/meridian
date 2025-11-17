import { useAuthActions } from '@convex-dev/auth/react'
import {
  Button,
  Card,
  Container,
  Image,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconBrandGithub } from '@tabler/icons-react'

export default function Login() {
  const { signIn } = useAuthActions()

  return (
    <Container size={420} py={80}>
      <Card withBorder shadow="md" radius="md" p="xl">
        <Stack align="center" gap="lg">
          <Image
            src="/logo.png"
            width={44}
            height={44}
            style={{ width: '5rem', height: '5rem', objectFit: 'contain' }}
          />
          <div style={{ textAlign: 'center' }}>
            <Title order={2} fw={800} mb="xs">
              Welcome to Meridian
            </Title>
            <Text c="dimmed" mb="xl">
              Sign in to manage your data and analytics
            </Text>
          </div>

          <Button
            leftSection={<IconBrandGithub size={20} />}
            onClick={() => void signIn('github', { redirectTo: '/dashboard' })}
            size="md"
            fullWidth
            variant="outline"
            color="dark"
            radius="md"
          >
            Continue with GitHub
          </Button>

          <Text size="sm" c="dimmed" mt="md">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </Stack>
      </Card>
    </Container>
  )
}
