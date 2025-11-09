import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Container,
  Title,
  Text,
  Button,
  Badge,
  Stack,
  List,
  ThemeIcon,
  Image,
  Paper,
  Group,
} from '@mantine/core'
import {
  IconBolt,
  IconUsers,
  IconChartBar,
  IconUpload,
  IconEdit,
} from '@tabler/icons-react'
import { motion } from 'motion/react'
import classes from '@/public/styles/index.module.css'

export const Route = createFileRoute('/')({
  component: RouteComponent,
  beforeLoad: () => {
    // queryDatabase({ data: 'SELECT * FROM file1' })
  },
})

function RouteComponent() {
  return (
    <Container
      bg="var(--mantine-color-body)"
      px={0}
      py={{
        base: 'calc(var(--mantine-spacing-lg) * 4)',
        xs: 'calc(var(--mantine-spacing-lg) * 5)',
        lg: 'calc(var(--mantine-spacing-lg) * 6)',
      }}
      fluid
    >
      <Container size="md" px={0}>
        <Stack align="center" gap="xs">
          <motion.div
            initial={{ opacity: 0.0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            viewport={{ once: true }}
          >
            <Title
              order={1}
              fw={900}
              fz={48}
              c="dark"
              mb="sm"
              ta="center"
              style={{ textWrap: 'balance' }}
            >
              Insite
            </Title>
          </motion.div>
          <motion.div
            initial={{ opacity: 0.0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeInOut' }}
            viewport={{ once: true }}
          >
            <Text
              c="dimmed"
              fz="xl"
              ta="center"
              mb="xl"
              style={{ textWrap: 'balance', maxWidth: 600 }}
            >
              Collaborative platform for data science projects; for non-data
              science people. Upload files, create data frames and insights,
              modify the data as needed, generate charts, work with coworkers in
              real-time (queries made by them will be shown), do everything
              while moving in <b>LIGHTNING ⚡ speed</b>.
            </Text>
          </motion.div>
          <motion.div
            initial={{ opacity: 0.0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: 'easeInOut' }}
            viewport={{ once: true }}
          >
            <Group mt="md" gap="md">
              <motion.div whileHover={{ scale: 1.1 }}>
                <Button
                  size="lg"
                  radius="xl"
                  component={Link}
                  to="/dashboard"
                  color="yellow"
                  leftSection={<IconBolt size={20} />}
                  className={classes.cta}
                >
                  Get Started
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }}>
                <Button
                  size="lg"
                  radius="xl"
                  variant="outline"
                  component="a"
                  href="https://github.com/"
                  target="_blank"
                  className={classes.cta}
                >
                  GitHub
                </Button>
              </motion.div>
            </Group>
          </motion.div>
        </Stack>
      </Container>
      <Container size="xl" mt="calc(var(--mantine-spacing-xl) * 2)" px={0}>
        <motion.div
          initial={{ opacity: 0.0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: 'easeInOut' }}
          viewport={{ once: true }}
        >
          <motion.div
            whileHover={{ scale: 1.05, boxShadow: 'var(--mantine-shadow-xl)' }}
            transition={{ type: 'spring' }}
          >
            <Image
              src="/hero.png"
              radius="sm"
              alt="Insite Hero"
              width={1920}
              height={800}
              style={{ objectFit: 'contain' }}
            />
          </motion.div>
        </motion.div>
      </Container>
      <Container size="md" px={0} mt="xl">
        <Paper shadow="md" p="xl" radius="lg" maw={700} w="100%" mx="auto">
          <Title order={3} mb="md" ta="center">
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
        <Text ta="center" size="sm" c="dimmed" mt="xl">
          Made with ❤️ for teams who want to move fast.
        </Text>
      </Container>
    </Container>
  )
}
