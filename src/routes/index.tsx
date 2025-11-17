import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Card,
  Badge,
  Box,
  rem,
  ThemeIcon,
  Avatar,
  Blockquote,
} from '@mantine/core'
import {
  IconBolt,
  IconUsers,
  IconChartBar,
  IconUpload,
  IconEdit,
  IconRocket,
  IconShield,
  IconCheck,
  IconArrowRight,
} from '@tabler/icons-react'
import { motion } from 'motion/react'
import { PricingTable } from 'autumn-js/react'
import { useAuthActions } from '@convex-dev/auth/react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { signIn } = useAuthActions()

  const features = [
    {
      icon: IconUpload,
      title: 'Instant File Upload',
      description:
        'Upload CSV, Excel, and other data files instantly. Automatically create data frames and start analyzing in seconds.',
      color: 'blue',
    },
    {
      icon: IconChartBar,
      title: 'Smart Insights',
      description:
        'Generate charts and insights with AI-powered analysis. No coding required - just ask questions and get answers.',
      color: 'teal',
    },
    {
      icon: IconEdit,
      title: 'No-Code Data Editing',
      description:
        'Modify and transform your data without writing a single line of code. Intuitive interface for all skill levels.',
      color: 'grape',
    },
    {
      icon: IconUsers,
      title: 'Real-Time Collaboration',
      description:
        'Work with your team in real-time. See queries, changes, and insights as they happen. Built for teamwork.',
      color: 'orange',
    },
    {
      icon: IconBolt,
      title: 'Lightning Fast',
      description:
        'Experience blazing-fast performance powered by DuckDB. Query and analyze large datasets in milliseconds.',
      color: 'yellow',
    },
    {
      icon: IconShield,
      title: 'Secure & Private',
      description:
        'Your data stays secure with enterprise-grade encryption. Full control over your data and privacy settings.',
      color: 'green',
    },
  ]

  const stats = [
    { label: 'Active Users', value: '10K+' },
    { label: 'Data Files Processed', value: '500K+' },
    { label: 'Queries Executed', value: '2M+' },
    { label: 'Teams Using Meridian', value: '1K+' },
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Data Analyst',
      company: 'TechCorp',
      content:
        'Meridian transformed how our team works with data. The real-time collaboration features are game-changing.',
      avatar: 'SC',
    },
    {
      name: 'Michael Rodriguez',
      role: 'Product Manager',
      company: 'StartupXYZ',
      content:
        'Finally, a tool that makes data analysis accessible to everyone on the team. No more waiting for data scientists.',
      avatar: 'MR',
    },
    {
      name: 'Emily Johnson',
      role: 'Business Intelligence Lead',
      company: 'Enterprise Inc',
      content:
        'The speed and ease of use is incredible. We can now answer business questions in minutes instead of days.',
      avatar: 'EJ',
    },
  ]

  return (
    <Box>
      {/* Hero Section */}
      <Container size="xl" py={{ base: rem(60), md: rem(100) }}>
        <Stack align="center" gap="xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge
              size="lg"
              variant="light"
              color="blue"
              mb="md"
              leftSection={<IconRocket size={20} />}
            >
              Built for Teams
            </Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Title
              order={1}
              fw={900}
              fz={{ base: rem(36), sm: rem(48), md: rem(64) }}
              ta="center"
              style={{ textWrap: 'balance', lineHeight: 1.2 }}
            >
              Collaborative Data Science
              <br />
              <Text span inherit c="blue" style={{ display: 'inline-block' }}>
                Made Simple
              </Text>
            </Title>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Text
              c="dimmed"
              fz={{ base: rem(16), md: rem(20) }}
              ta="center"
              maw={700}
              style={{ textWrap: 'balance' }}
            >
              Upload files, create data frames and insights, modify data as
              needed, generate charts, and collaborate with your team in
              real-time—all while moving at{' '}
              <Text span fw={600} c="blue">
                lightning speed
              </Text>
              .
            </Text>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Group gap="md" mt="xl">
              <Button
                size="lg"
                radius="xl"
                component={Link}
                to="/dashboard"
                onClick={() =>
                  void signIn('github', { redirectTo: '/dashboard' })
                }
                leftSection={<IconBolt size={20} />}
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
          </motion.div>
        </Stack>
      </Container>

      {/* Stats Section */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderTop: '1px solid var(--mantine-color-gray-2)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
        py={{ base: rem(40), md: rem(60) }}
      >
        <Container size="xl">
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xl">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Stack align="center" gap="xs">
                  <Text fz={{ base: rem(28), md: rem(36) }} fw={700} c="blue">
                    {stat.value}
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {stat.label}
                  </Text>
                </Stack>
              </motion.div>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
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
                Features
              </Badge>
              <Title
                order={2}
                fw={800}
                ta="center"
                fz={{ base: rem(32), md: rem(40) }}
              >
                Everything You Need to Work with Data
              </Title>
              <Text
                c="dimmed"
                fz={{ base: rem(16), md: rem(18) }}
                ta="center"
                maw={600}
              >
                Powerful features designed to make data analysis accessible,
                fast, and collaborative.
              </Text>
            </Stack>
          </motion.div>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl" mt="xl">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
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
                    height: '100%',
                    border: '1px solid var(--mantine-color-gray-2)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ThemeIcon
                    size={rem(48)}
                    radius="md"
                    variant="light"
                    color={feature.color}
                    mb="md"
                  >
                    <feature.icon size={rem(24)} />
                  </ThemeIcon>
                  <Title order={4} fw={600} mb="xs">
                    {feature.title}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {feature.description}
                  </Text>
                </Card>
              </motion.div>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* Testimonials Section */}
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
                  Testimonials
                </Badge>
                <Title
                  order={2}
                  fw={800}
                  ta="center"
                  fz={{ base: rem(32), md: rem(40) }}
                >
                  Loved by Teams Worldwide
                </Title>
                <Text
                  c="dimmed"
                  fz={{ base: rem(16), md: rem(18) }}
                  ta="center"
                  maw={600}
                >
                  See what our users have to say about their experience with
                  Meridian.
                </Text>
              </Stack>
            </motion.div>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt="xl">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
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
                      height: '100%',
                      border: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <Blockquote
                      cite={`— ${testimonial.name}, ${testimonial.role}`}
                      icon={<IconCheck size={rem(20)} />}
                      color="blue"
                    >
                      {testimonial.content}
                    </Blockquote>
                    <Group gap="xs" mt="md">
                      <Avatar color="blue" radius="xl">
                        {testimonial.avatar}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>
                          {testimonial.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {testimonial.role} at {testimonial.company}
                        </Text>
                      </div>
                    </Group>
                  </Card>
                </motion.div>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container size="xl" py={{ base: rem(60), md: rem(100) }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <Paper
            shadow="lg"
            p={{ base: rem(40), md: rem(60) }}
            radius="lg"
            style={{
              border: '1px solid var(--mantine-color-gray-2)',
              textAlign: 'center',
            }}
          >
            <Stack align="center" gap="xl">
              <Image
                src="/logo.png"
                width={44}
                height={44}
                style={{ width: '5rem', height: '5rem', objectFit: 'contain' }}
              />
              <Title order={2} fw={800} fz={{ base: rem(28), md: rem(36) }}>
                Ready to Get Started?
              </Title>
              <Text c="dimmed" fz={{ base: rem(16), md: rem(18) }} maw={600}>
                Join thousands of teams already using Meridian to transform how
                they work with data. Get started in minutes, no credit card
                required.
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
                  leftSection={<IconBolt size={20} />}
                  rightSection={<IconArrowRight size={18} />}
                >
                  Start Free Trial
                </Button>
                <Button
                  size="lg"
                  radius="xl"
                  variant="outline"
                  component={Link}
                  to="/features"
                >
                  Learn More
                </Button>
              </Group>
            </Stack>
          </Paper>
        </motion.div>
      </Container>

      {/* Pricing Section */}
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
                  Pricing
                </Badge>
                <Title
                  order={2}
                  fw={800}
                  ta="center"
                  fz={{ base: rem(32), md: rem(40) }}
                >
                  Simple, Transparent Pricing
                </Title>
                <Text
                  c="dimmed"
                  fz={{ base: rem(16), md: rem(18) }}
                  ta="center"
                  maw={600}
                >
                  Choose the plan that works best for your team. All plans
                  include our core features.
                </Text>
              </Stack>
            </motion.div>
            <PricingTable />
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
