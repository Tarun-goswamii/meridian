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
  List,
} from '@mantine/core'
import {
  IconUpload,
  IconChartBar,
  IconEdit,
  IconUsers,
  IconBolt,
  IconShield,
  IconDatabase,
  IconCode,
  IconCloud,
  IconLock,
  IconRocket,
  IconArrowRight,
  IconCheck,
} from '@tabler/icons-react'
import { motion } from 'motion/react'
import { useAuthActions } from '@convex-dev/auth/react'

export const Route = createFileRoute('/features')({
  component: RouteComponent,
})

function RouteComponent() {
  const { signIn } = useAuthActions()

  const mainFeatures = [
    {
      icon: IconUpload,
      title: 'File Upload & Management',
      description:
        'Upload CSV, Excel, JSON, and other data formats instantly. Our intelligent system automatically detects column types and creates optimized data frames.',
      details: [
        'Support for multiple file formats',
        'Automatic schema detection',
        'Drag and drop interface',
        'Batch file processing',
      ],
      color: 'blue',
    },
    {
      icon: IconChartBar,
      title: 'AI-Powered Insights',
      description:
        'Generate charts, visualizations, and insights using natural language. Ask questions about your data and get instant answers with beautiful visualizations.',
      details: [
        'Natural language queries',
        'Automatic chart generation',
        'Statistical analysis',
        'Pattern detection',
      ],
      color: 'teal',
    },
    {
      icon: IconEdit,
      title: 'No-Code Data Editing',
      description:
        'Transform, filter, and modify your data without writing a single line of code. Intuitive interface makes data manipulation accessible to everyone.',
      details: [
        'Visual query builder',
        'Data transformation tools',
        'Filter and sort operations',
        'Column management',
      ],
      color: 'grape',
    },
    {
      icon: IconUsers,
      title: 'Real-Time Collaboration',
      description:
        'Work with your team in real-time. See queries, changes, and insights as they happen. Built-in presence indicators show whos working on what.',
      details: [
        'Live query visibility',
        'Real-time updates',
        'Team presence indicators',
        'Shared workspaces',
      ],
      color: 'orange',
    },
    {
      icon: IconBolt,
      title: 'Lightning Fast Performance',
      description:
        'Powered by DuckDB, Meridian delivers blazing-fast query performance. Analyze large datasets in milliseconds, not minutes.',
      details: [
        'DuckDB-powered engine',
        'Optimized query execution',
        'Fast data loading',
        'Efficient memory usage',
      ],
      color: 'yellow',
    },
    {
      icon: IconShield,
      title: 'Security & Privacy',
      description:
        'Enterprise-grade security with encryption at rest and in transit. Full control over your data with granular permissions and access controls.',
      details: [
        'End-to-end encryption',
        'Role-based access control',
        'Data isolation',
        'Audit logs',
      ],
      color: 'green',
    },
  ]

  const additionalFeatures = [
    {
      icon: IconDatabase,
      title: 'Multiple Data Sources',
      description: 'Connect to databases, APIs, and cloud storage services.',
    },
    {
      icon: IconCode,
      title: 'SQL Query Editor',
      description:
        'Advanced SQL editor with syntax highlighting and autocomplete.',
    },
    {
      icon: IconCloud,
      title: 'Cloud Sync',
      description:
        'Automatic cloud synchronization keeps your data accessible everywhere.',
    },
    {
      icon: IconLock,
      title: 'Version Control',
      description:
        'Track changes and rollback to previous versions of your data.',
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
                Features
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
                Powerful Features for
                <br />
                <Text span inherit c="blue">
                  Modern Data Teams
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
                Everything you need to analyze data, collaborate with your team,
                and make data-driven decisions—all in one platform.
              </Text>
            </motion.div>
          </Stack>
        </Container>
      </Box>

      {/* Main Features */}
      <Container size="xl" py={{ base: rem(60), md: rem(100) }}>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          {mainFeatures.map((feature, index) => (
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
                h="100%"
                style={{
                  border: '1px solid var(--mantine-color-gray-2)',
                }}
              >
                <ThemeIcon
                  size={56}
                  radius="md"
                  variant="light"
                  color={feature.color}
                  mb="md"
                >
                  <feature.icon size={28} />
                </ThemeIcon>
                <Title order={3} fw={700} mb="sm">
                  {feature.title}
                </Title>
                <Text c="dimmed" mb="md" size="sm">
                  {feature.description}
                </Text>
                <List
                  spacing="xs"
                  size="sm"
                  icon={
                    <ThemeIcon color={feature.color} size={rem(20)} radius="xl">
                      <IconCheck size={rem(12)} />
                    </ThemeIcon>
                  }
                >
                  {feature.details.map((detail) => (
                    <List.Item key={detail}>{detail}</List.Item>
                  ))}
                </List>
              </Card>
            </motion.div>
          ))}
        </SimpleGrid>
      </Container>

      {/* Additional Features */}
      <Box
        style={{
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderTop: '1px solid var(--mantine-color-gray-2)',
        }}
        py={{ base: rem(60), md: rem(80) }}
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
                <Title
                  order={2}
                  fw={800}
                  ta="center"
                  fz={{ base: rem(28), md: rem(36) }}
                >
                  And So Much More
                </Title>
                <Text
                  c="dimmed"
                  fz={{ base: rem(16), md: rem(18) }}
                  ta="center"
                  maw={600}
                >
                  Additional features that make Meridian the complete solution
                  for your data needs.
                </Text>
              </Stack>
            </motion.div>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xl" mt="xl">
              {additionalFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card
                    shadow="sm"
                    padding="lg"
                    radius="lg"
                    h="100%"
                    style={{
                      border: '1px solid var(--mantine-color-gray-2)',
                    }}
                  >
                    <ThemeIcon
                      size={40}
                      radius="md"
                      variant="light"
                      color="blue"
                      mb="md"
                    >
                      <feature.icon size={20} />
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
      </Box>

      {/* CTA Section */}
      <Container size="xl" py={{ base: rem(60), md: rem(80) }}>
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
                Ready to Experience These Features?
              </Title>
              <Text c="dimmed" fz={{ base: rem(16), md: rem(18) }} maw={600}>
                Start using Meridian today and see how these features can
                transform your data workflow.
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
                  to="/"
                >
                  View Pricing
                </Button>
              </Group>
            </Stack>
          </Card>
        </motion.div>
      </Container>
    </Box>
  )
}
