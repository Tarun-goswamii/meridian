import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  ThemeIcon,
  List,
  Paper,
  Stack,
} from '@mantine/core'
import {
  IconBolt,
  IconUsers,
  IconChartBar,
  IconUpload,
  IconEdit,
} from '@tabler/icons-react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  beforeLoad: () => {
    // queryDatabase({ data: 'SELECT * FROM file1' })
  },
})

function RouteComponent() {
  return (
    <Container size="lg" py={60}>
      <Stack align="center" spacing="xl">
        <ThemeIcon size={64} radius="xl" color="yellow" variant="light">
          <IconBolt size={40} />
        </ThemeIcon>
        <Title order={1} align="center" fw={900} size={48} c="dark">
          Insite
        </Title>
        <Text align="center" size="xl" c="dimmed" maw={600}>
          Collaborative platform for data science projects; for non-data science
          people. Upload files, create data frames and insights, modify the data
          as needed, generate charts, work with coworkers in real-time (queries
          made by them will be shown), do everything while moving in{' '}
          <b>LIGHTNING ⚡ speed</b>.
        </Text>
        <Group mt="md" spacing="md">
          <Button
            size="lg"
            radius="xl"
            component={Link}
            to="/dashboard"
            color="yellow"
            leftSection={<IconBolt size={20} />}
          >
            Get Started
          </Button>
          <Button
            size="lg"
            radius="xl"
            variant="outline"
            component="a"
            href="https://github.com/"
            target="_blank"
          >
            GitHub
          </Button>
        </Group>
        <Paper shadow="md" p="xl" radius="lg" mt={40} maw={700} w="100%">
          <Title order={3} mb="md" align="center">
            Why Insite?
          </Title>
          <List
            spacing="lg"
            size="lg"
            icon={
              <ThemeIcon color="yellow" size={32} radius="xl">
                <IconBolt size={18} />
              </ThemeIcon>
            }
          >
            <List.Item
              icon={
                <ThemeIcon color="blue" size={32} radius="xl">
                  <IconUpload size={18} />
                </ThemeIcon>
              }
            >
              <b>Upload files</b> and instantly create data frames
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="teal" size={32} radius="xl">
                  <IconChartBar size={18} />
                </ThemeIcon>
              }
            >
              <b>Generate charts</b> and insights with ease
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="grape" size={32} radius="xl">
                  <IconEdit size={18} />
                </ThemeIcon>
              }
            >
              <b>Modify data</b> as needed, no code required
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="orange" size={32} radius="xl">
                  <IconUsers size={18} />
                </ThemeIcon>
              }
            >
              <b>Collaborate in real-time</b> with your team
            </List.Item>
            <List.Item>
              <b>Lightning fast</b> experience ⚡
            </List.Item>
          </List>
        </Paper>
        <Text align="center" size="sm" c="dimmed" mt="xl">
          Made with ❤️ for teams who want to move fast.
        </Text>
      </Stack>
    </Container>
  )
}
