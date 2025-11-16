import { useAuthActions } from '@convex-dev/auth/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import {
  Avatar,
  Box,
  Button,
  Group,
  Menu,
  Text,
  rem,
} from '@mantine/core'
import {
  IconDatabase,
  IconLogout,
  IconUser,
  IconChevronDown,
} from '@tabler/icons-react'

export function Navbar() {
  const { signIn, signOut } = useAuthActions()
  const { data: user } = useSuspenseQuery(
    convexQuery(api.authFns.currentUser, {}),
  )

  return (
    <Box
      component="header"
      style={{
        padding: '0 2rem',
        height: '4rem',
        backgroundColor: 'var(--mantine-color-white)',
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <Group justify="space-between" h="100%" wrap="nowrap">
        <Group gap="xs">
          <IconDatabase size={28} color="var(--mantine-color-blue-6)" />
          <Text fw={700} size="xl" c="dark.4">
            Meridian
          </Text>
        </Group>

        {user.isAuthenticated ? (
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <Button
                variant="default"
                leftSection={
                  <Avatar
                    size={28}
                    radius="xl"
                    color="blue"
                    style={{ border: '1px solid var(--mantine-color-gray-3)' }}
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </Avatar>
                }
                rightSection={
                  <IconChevronDown
                    style={{ width: rem(16), height: rem(16) }}
                  />
                }
                style={{ border: '1px solid var(--mantine-color-gray-3)' }}
              >
                {user.name}
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item
                leftSection={
                  <IconUser style={{ width: rem(16), height: rem(16) }} />
                }
              >
                Profile
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={
                  <IconLogout style={{ width: rem(16), height: rem(16) }} />
                }
                onClick={() => void signOut()}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void signIn('github', { redirectTo: '/dashboard' })}
            style={{ fontWeight: 500 }}
          >
            Sign In
          </Button>
        )}
      </Group>
    </Box>
  )
}
