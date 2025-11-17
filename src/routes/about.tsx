import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Card,
  Badge,
  Box,
  rem,
  ThemeIcon,
  Group,
  Button,
  Avatar,
  Divider,
  Image,
} from '@mantine/core'
import {
  IconRocket,
  IconTarget,
  IconHeart,
  IconUsers,
  IconArrowRight,
  IconDatabase,
  IconCode,
  IconChartBar,
} from '@tabler/icons-react'
import { motion } from 'motion/react'
import { useAuthActions } from '@convex-dev/auth/react'

export const Route = createFileRoute('/about')({
  component: RouteComponent,
})

function RouteComponent() {
  const { signIn } = useAuthActions()

  const values = [
    {
      icon: IconRocket,
      title: 'Speed',
      description:
        "We believe data analysis should be fast. That's why we built Meridian with performance as a core principle.",
      color: 'blue',
    },
    {
      icon: IconTarget,
      title: 'Simplicity',
      description:
        "Complex tools shouldn't require complex setup. Meridian is designed to be intuitive and accessible.",
      color: 'teal',
    },
    {
      icon: IconHeart,
      title: 'User-Centric',
      description:
        "Every feature we build starts with understanding our users' needs and pain points.",
      color: 'red',
    },
    {
      icon: IconUsers,
      title: 'Collaboration',
      description:
        'We believe the best insights come from teams working together, not individuals working in isolation.',
      color: 'orange',
    },
  ]

  const team = [
    {
      name: 'The Meridian Team',
      role: 'Building the Future of Data Collaboration',
      description:
        "We're a passionate team of engineers, designers, and data enthusiasts dedicated to making data analysis accessible to everyone.",
    },
  ]

  return (
    <Box>
      {/* Hero Section */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
        py={{ base: rem(60), md: rem(80) }}
      >
        <Container size="xl">
          <Stack align="center" gap="xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge size="lg" variant="light" color="blue" mb="md">
                About Us
              </Badge>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Title
                order={1}
                fw={900}
                ta="center"
                fz={{ base: rem(36), md: rem(48) }}
                style={{ textWrap: 'balance' }}
              >
                Making Data Analysis
                <br />
                <Text span inherit c="blue">
                  Accessible to Everyone
                </Text>
              </Title>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Text
                c="dimmed"
                fz={{ base: rem(16), md: rem(18) }}
                ta="center"
                maw={700}
              >
                Meridian was born from a simple observation: data analysis
                shouldn\'t require a data science degree. We\'re building tools
                that make working with data as natural as using a spreadsheet.
              </Text>
            </motion.div>
          </Stack>
        </Container>
      </Box>

      {/* Mission Section */}
      <Container size="xl" py={{ base: rem(60), md: rem(100) }}>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Stack gap="md">
              <Badge size="lg" variant="light" color="blue" w="fit-content">
                Our Mission
              </Badge>
              <Title order={2} fw={800} fz={{ base: rem(28), md: rem(36) }}>
                Empowering Teams Through Data
              </Title>
              <Text c="dimmed" fz={{ base: rem(16), md: rem(18) }}>
                At Meridian, we believe that data analysis should be accessible
                to everyone, regardless of their technical background. Our
                mission is to break down the barriers between data and insights,
                enabling teams to make better decisions faster.
              </Text>
              <Text c="dimmed" fz={{ base: rem(16), md: rem(18) }}>
                We\'re building a platform that combines the power of modern
                data tools with the simplicity of everyday software. No complex
                setups, no steep learning curves—just powerful tools that work
                the way you think.
              </Text>
            </Stack>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card
              shadow="sm"
              padding="xl"
              radius="lg"
              style={{
                border: '1px solid var(--mantine-color-gray-2)',
              }}
            >
              <Stack gap="lg">
                <Group gap="md">
                  <Image src="/logo.png" width={28} height={28} />

                  <div>
                    <Text fw={600} size="lg">
                      Built for Speed
                    </Text>
                    <Text size="sm" c="dimmed">
                      Powered by DuckDB for lightning-fast queries
                    </Text>
                  </div>
                </Group>
                <Divider />
                <Group gap="md">
                  <ThemeIcon size={8} radius="md" variant="light" color="teal">
                    <IconCode size={rem(24)} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="lg">
                      No-Code Required
                    </Text>
                    <Text size="sm" c="dimmed">
                      Intuitive interface for all skill levels
                    </Text>
                  </div>
                </Group>
                <Divider />
                <Group gap="md">
                  <ThemeIcon
                    size={8}
                    radius="md"
                    variant="light"
                    color="orange"
                  >
                    <IconChartBar size={8} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="lg">
                      Real-Time Collaboration
                    </Text>
                    <Text size="sm" c="dimmed">
                      Work together seamlessly with your team
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>
          </motion.div>
        </SimpleGrid>
      </Container>

      {/* Values Section */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderTop: '1px solid var(--mantine-color-gray-2)',
        }}
        py={{ base: rem(60), md: rem(100) }}
      >
        <Container size="xl">
          <Stack gap="xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Stack align="center" gap="md">
                <Badge size="lg" variant="light" color="blue">
                  Our Values
                </Badge>
                <Title
                  order={2}
                  fw={800}
                  ta="center"
                  fz={{ base: rem(28), md: rem(36) }}
                >
                  What Drives Us
                </Title>
                <Text
                  c="dimmed"
                  fz={{ base: rem(16), md: rem(18) }}
                  ta="center"
                  maw={600}
                >
                  These core values guide everything we do at Meridian.
                </Text>
              </Stack>
            </motion.div>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl" mt="xl">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card
                    shadow="sm"
                    padding="xl"
                    radius="lg"
                    h="100%"
                    style={{
                      border: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <ThemeIcon
                      size={48}
                      radius="md"
                      variant="light"
                      color={value.color}
                      mb="md"
                    >
                      <value.icon size={24} />
                    </ThemeIcon>
                    <Title order={4} fw={600} mb="xs">
                      {value.title}
                    </Title>
                    <Text size="sm" c="dimmed">
                      {value.description}
                    </Text>
                  </Card>
                </motion.div>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Team Section */}
      <Container size="xl" py={{ base: rem(60), md: rem(100) }}>
        <Stack gap="xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Stack align="center" gap="md">
              <Badge size="lg" variant="light" color="blue">
                The Team
              </Badge>
              <Title
                order={2}
                fw={800}
                ta="center"
                fz={{ base: rem(28), md: rem(36) }}
              >
                Meet the People Behind Meridian
              </Title>
            </Stack>
          </motion.div>

          <SimpleGrid cols={{ base: 1, md: 1 }} spacing="xl" mt="xl">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  shadow="sm"
                  padding="xl"
                  radius="lg"
                  style={{
                    border: '1px solid var(--mantine-color-gray-2)',
                  }}
                >
                  <Group gap="xl" wrap="nowrap">
                    <Avatar size={80} radius="md" color="blue">
                      <IconUsers size={40} />
                    </Avatar>
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Title order={3} fw={700}>
                        {member.name}
                      </Title>
                      <Text fw={500} c="blue" size="sm">
                        {member.role}
                      </Text>
                      <Text c="dimmed" size="sm" mt="xs">
                        {member.description}
                      </Text>
                    </Stack>
                  </Group>
                </Card>
              </motion.div>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* CTA Section */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderTop: '1px solid var(--mantine-color-gray-2)',
        }}
        py={{ base: rem(60), md: rem(80) }}
      >
        <Container size="xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card
              shadow="lg"
              radius="lg"
              style={{
                border: '1px solid var(--mantine-color-gray-2)',
                textAlign: 'center',
              }}
            >
              <Stack align="center" gap="xl">
                <IconRocket size={64} color="var(--mantine-color-blue-6)" />
                <Title order={2} fw={800} fz={{ base: rem(28), md: rem(36) }}>
                  Join Us on This Journey
                </Title>
                <Text c="dimmed" fz={{ base: rem(16), md: rem(18) }} maw={600}>
                  We\'re just getting started. Join thousands of teams already
                  using Meridian to transform their data workflows.
                </Text>
                <Group gap="md" mt="md">
                  <Button
                    size="lg"
                    radius="xl"
                    component={Link}
                    to="/dashboard"
                    onClick={() =>
                      void signIn('github', { redirectTo: '/dashboard' })
                    }
                    rightSection={<IconArrowRight size={18} />}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    size="lg"
                    radius="xl"
                    variant="outline"
                    component={Link}
                    to="/features"
                  >
                    Explore Features
                  </Button>
                </Group>
              </Stack>
            </Card>
          </motion.div>
        </Container>
      </Box>
    </Box>
  )
}
