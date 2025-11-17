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
  Container,
  NavLink,
  Burger,
  Drawer,
  Stack,
  Flex,
  Image,
} from '@mantine/core'
import {
  IconDatabase,
  IconLogout,
  IconUser,
  IconChevronDown,
  IconDashboard,
  IconChartBar,
  IconUsers,
} from '@tabler/icons-react'
import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'

export function Navbar({ authed }: { authed?: boolean }) {
  const { signIn, signOut } = useAuthActions()
  const { data: user } = useSuspenseQuery(
    convexQuery(api.authFns.currentUser, {}),
  )
  const location = useLocation()
  const [drawerOpened, setDrawerOpened] = useState(false)

  const isAuthenticated = user?.isAuthenticated

  const navLinks = [
    { to: '/features', label: 'Features', icon: IconChartBar },
    { to: '/about', label: 'About', icon: IconUsers },
  ]

  // If authed (authenticated route), make zIndex -1 and remove distractions (leave only logo and perhaps user/account button)
  if (authed) {
    return (
      <Box
        component="header"
        style={{
          backgroundColor: 'var(--mantine-color-white)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          zIndex: -1,
          backdropFilter: 'blur(10px)',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <Group justify="space-between" h="4rem" wrap="nowrap">
          <Group gap="xs">
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: rem(8),
              }}
            >
              <Image src="/logo.png" width={28} height={28} />
              <Text fw={700} size="xl" c="dark.4">
                Meridian
              </Text>
            </Link>
          </Group>

          {isAuthenticated && (
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Button
                  variant="default"
                  leftSection={
                    <Avatar
                      size={28}
                      radius="xl"
                      color="blue"
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                      }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  rightSection={
                    <IconChevronDown style={{ width: 16, height: 16 }} />
                  }
                  style={{
                    border: '1px solid var(--mantine-color-gray-3)',
                  }}
                >
                  {user.name}
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser style={{ width: 16, height: 16 }} />}
                >
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout style={{ width: 16, height: 16 }} />}
                  onClick={() => void signOut()}
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Box>
    )
  }

  // Public (marketing) version: normal navbar with links and actions
  return (
    <Box
      component="header"
      style={{
        backgroundColor: 'var(--mantine-color-white)',
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container size="xl" px="xl">
        <Group justify="space-between" h="4rem" wrap="nowrap">
          <Group gap="xs">
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: rem(8),
              }}
            >
              <Image src="/logo.png" width={28} height={28} />
              <Text fw={700} size="xl" c="dark.4">
                Meridian
              </Text>
            </Link>
          </Group>

          <Flex gap="md" visibleFrom="md">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                component={Link}
                to={link.to}
                label={link.label}
                leftSection={<link.icon size={16} />}
                active={location.pathname === link.to}
                style={{
                  borderRadius: rem(6),
                  textDecoration: 'none',
                }}
              />
            ))}
          </Flex>

          <Group gap="sm" visibleFrom="md">
            {isAuthenticated ? (
              <>
                <Button
                  component={Link}
                  to="/dashboard"
                  variant="subtle"
                  leftSection={<IconDashboard size={16} />}
                >
                  Dashboard
                </Button>
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Button
                      variant="default"
                      leftSection={
                        <Avatar
                          size={28}
                          radius="xl"
                          color="blue"
                          style={{
                            border: '1px solid var(--mantine-color-gray-3)',
                          }}
                        >
                          {user.name?.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                      rightSection={
                        <IconChevronDown style={{ width: 16, height: 16 }} />
                      }
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                      }}
                    >
                      {user.name}
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Account</Menu.Label>
                    <Menu.Item
                      leftSection={
                        <IconUser style={{ width: 16, height: 16 }} />
                      }
                    >
                      Profile
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={
                        <IconLogout style={{ width: 16, height: 16 }} />
                      }
                      onClick={() => void signOut()}
                    >
                      Sign out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </>
            ) : (
              <>
                <Button variant="subtle" component={Link} to="/features">
                  Features
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void signIn('github', { redirectTo: '/dashboard' })
                  }
                  style={{ fontWeight: 500 }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  to="/dashboard"
                  onClick={() =>
                    void signIn('github', { redirectTo: '/dashboard' })
                  }
                >
                  Get Started
                </Button>
              </>
            )}
          </Group>

          <Burger
            opened={drawerOpened}
            onClick={() => setDrawerOpened((o) => !o)}
            hiddenFrom="md"
            size="sm"
          />
        </Group>
      </Container>

      <Drawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        title="Menu"
        padding="md"
        hiddenFrom="md"
      >
        <Stack gap="xs">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              component={Link}
              to={link.to}
              label={link.label}
              leftSection={<link.icon size={16} />}
              active={location.pathname === link.to}
              onClick={() => setDrawerOpened(false)}
            />
          ))}
          {isAuthenticated ? (
            <>
              <NavLink
                component={Link}
                to="/dashboard"
                label="Dashboard"
                leftSection={<IconDashboard size={16} />}
                onClick={() => setDrawerOpened(false)}
              />
              <Button
                variant="outline"
                color="red"
                leftSection={<IconLogout size={16} />}
                onClick={() => {
                  void signOut()
                  setDrawerOpened(false)
                }}
                fullWidth
                mt="md"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button
              fullWidth
              mt="md"
              onClick={() => {
                void signIn('github', { redirectTo: '/dashboard' })
                setDrawerOpened(false)
              }}
            >
              Get Started
            </Button>
          )}
        </Stack>
      </Drawer>
    </Box>
  )
}
