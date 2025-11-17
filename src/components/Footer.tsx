import {
  Container,
  Group,
  Text,
  Stack,
  Anchor,
  Divider,
  Box,
  Image,
} from '@mantine/core'
import {
  IconBrandGithub,
  IconBrandTwitter,
  IconMail,
} from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <Box
      component="footer"
      style={{
        backgroundColor: 'var(--mantine-color-gray-0)',
        borderTop: '1px solid var(--mantine-color-gray-2)',
        paddingTop: 'calc(var(--mantine-spacing-xl) * 2)',
        paddingBottom: 'calc(var(--mantine-spacing-xl) * 2)',
        marginTop: 'calc(var(--mantine-spacing-xl) * 3)',
      }}
    >
      <Container size="xl">
        <Group align="flex-start" justify="space-between" wrap="wrap" mb="xl">
          <Stack gap="xs" style={{ flex: '1 1 300px' }}>
            <Group gap="xs">
              <Image
                src="/logo.png"
                width={44}
                height={44}
                style={{ width: '5rem', height: '5rem', objectFit: 'contain' }}
              />
              <Text fw={700} size="lg" c="dark.4">
                Meridian
              </Text>
            </Group>
            <Text size="sm" c="dimmed" maw={300}>
              Collaborative platform for data science projects. Built for teams
              who want to move fast and work together seamlessly.
            </Text>
          </Stack>

          <Stack gap="xs" style={{ flex: '1 1 200px' }}>
            <Text fw={600} size="sm" mb="xs">
              Product
            </Text>
            <Anchor
              component={Link}
              to="/features"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Features
            </Anchor>
            <Anchor
              component={Link}
              to="/pricing"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Pricing
            </Anchor>
            <Anchor
              component="a"
              href="https://github.com/"
              target="_blank"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              GitHub
            </Anchor>
          </Stack>

          <Stack gap="xs" style={{ flex: '1 1 200px' }}>
            <Text fw={600} size="sm" mb="xs">
              Company
            </Text>
            <Anchor
              component={Link}
              to="/about"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              About
            </Anchor>
            <Anchor
              component="a"
              href="mailto:contact@meridian.dev"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Contact
            </Anchor>
            <Anchor
              component="a"
              href="#"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Blog
            </Anchor>
          </Stack>

          <Stack gap="xs" style={{ flex: '1 1 200px' }}>
            <Text fw={600} size="sm" mb="xs">
              Connect
            </Text>
            <Group gap="xs">
              <Anchor
                component="a"
                href="https://github.com/"
                target="_blank"
                c="dimmed"
                style={{ textDecoration: 'none' }}
              >
                <IconBrandGithub size={24} />
              </Anchor>
              <Anchor
                component="a"
                href="https://twitter.com/"
                target="_blank"
                c="dimmed"
                style={{ textDecoration: 'none' }}
              >
                <IconBrandTwitter size={24} />
              </Anchor>
              <Anchor
                component="a"
                href="mailto:contact@meridian.dev"
                c="dimmed"
                style={{ textDecoration: 'none' }}
              >
                <IconMail size={24} />
              </Anchor>
            </Group>
          </Stack>
        </Group>

        <Divider my="xl" />

        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed">
            © {new Date().getFullYear()} Meridian. All rights reserved.
          </Text>
          <Group gap="xl">
            <Anchor
              component="a"
              href="#"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Privacy
            </Anchor>
            <Anchor
              component="a"
              href="#"
              size="sm"
              c="dimmed"
              style={{ textDecoration: 'none' }}
            >
              Terms
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}
