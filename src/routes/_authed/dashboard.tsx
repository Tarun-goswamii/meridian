import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import FileUpload from '../../components/dashboard/FileUpload'
import {
  Group,
  Text,
  Card,
  ThemeIcon,
  ActionIcon,
  Button,
  Modal,
  Stack,
  Badge,
  Paper,
  Divider,
  Tooltip,
  Alert,
  Progress,
  Avatar,
  Menu,
  Box,
  SegmentedControl,
  CopyButton,
  ScrollArea,
  TextInput,
  Kbd,
  Container,
  SimpleGrid,
  rem,
} from '@mantine/core'
import {
  IconFile,
  IconTrash,
  IconUpload,
  IconDatabase,
  IconUser,
  IconChevronDown,
  IconCopy,
  IconSettings,
  IconChartBar,
  IconStar,
  IconSearch,
  IconClock,
  IconDeviceAnalytics,
  IconCheck,
  IconBook,
  IconLogout,
} from '@tabler/icons-react'
import { useMutation } from 'convex/react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_authed/dashboard')({
  component: Home,
})

function Home() {
  const [uploadModalOpened, setUploadModalOpened] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('activity')
  const [searchOpened, setSearchOpened] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get current user
  const { data: user } = useSuspenseQuery(
    convexQuery(api.authFns.currentUser, {}),
  )

  // Query to get uploaded files
  const { data: files = [] } = useQuery(convexQuery(api.csv.getFiles, {}))

  // Mutation to delete file
  const deleteFile = useMutation(api.csv.deleteFile)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpened((opened) => !opened)
      }

      if (event.key === 'Escape') {
        setSearchOpened(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const analytics = [
    {
      title: 'Files Uploaded',
      value: files.length,
      icon: IconUpload,
      accent: 'blue',
    },
    {
      title: 'Total Tables',
      value: files.filter((f) => f.duckdbProcessed).length,
      icon: IconDatabase,
      accent: 'green',
    },
    {
      title: 'Processing',
      value: files.filter((f) => !f.duckdbProcessed).length,
      icon: IconDeviceAnalytics,
      accent: 'orange',
    },
    {
      title: 'Total Size',
      value: formatFileSize(files.reduce((acc, f) => acc + f.fileSize, 0)),
      icon: IconChartBar,
      accent: 'teal',
    },
  ]

  const recentActivity = files.slice(0, 5).map((file) => ({
    id: file._id,
    action: file.duckdbProcessed ? 'processed' : 'uploaded',
    target: file.fileName,
    time: new Date(file.uploadedAt).toLocaleDateString(),
  }))

  const trendingFiles = files.filter((f) => f.duckdbProcessed).slice(0, 5)

  const handleUploadComplete = () => {
    setUploadModalOpened(false)
  }

  const notifications = files
    .filter((f) => f.duckdbProcessed)
    .slice(0, 2)
    .map((file) => ({
      id: file._id,
      title: 'File processed successfully',
      description: `${file.fileName} is now available as a table.`,
      icon: <IconCheck size={18} />,
      color: 'green' as const,
    }))

  const quickActions = [
    {
      label: 'Upload File',
      icon: <IconUpload size={18} />,
      onClick: () => setUploadModalOpened(true),
    },
    {
      label: 'View Docs',
      icon: <IconBook size={18} />,
      onClick: () => window.open('https://mantine.dev/', '_blank'),
    },
    {
      label: 'Spotlight',
      icon: <IconSearch size={18} />,
      onClick: () => setSearchOpened(true),
    },
  ]

  const spotlightActions = [
    ...quickActions,
    ...files.map((file) => ({
      label: file.fileName,
      icon: <IconFile size={18} />,
      onClick: () => {
        if (file.duckdbProcessed && file.duckdbTableName) {
          window.open(
            `/table/${encodeURIComponent(file.duckdbTableName)}`,
            '_blank',
          )
        }
      },
    })),
  ]

  const filteredSpotlightActions =
    searchQuery.trim().length === 0
      ? spotlightActions.slice(0, 8)
      : spotlightActions.filter((action) =>
          action.label.toLowerCase().includes(searchQuery.toLowerCase()),
        )

  const processed = files.filter((f) => f.duckdbProcessed).length
  const total = files.length
  const percent = total === 0 ? 0 : Math.round((processed / total) * 100)

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      {/* Spotlight / Command Palette */}
      {searchOpened && (
        <Paper
          shadow="md"
          p="md"
          radius="md"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: rem(400),
            maxWidth: rem(600),
            width: '90%',
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          <Stack gap="md">
            <Group gap="sm" align="center">
              <TextInput
                placeholder="Search files, tables, quick actions..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filteredSpotlightActions[0]) {
                    filteredSpotlightActions[0].onClick()
                    setSearchOpened(false)
                    setSearchQuery('')
                  }
                }}
                autoFocus
                style={{ flex: 1 }}
              />
              <Group gap={4}>
                <Kbd>Ctrl</Kbd>
                <Text size="xs" c="dimmed">
                  +
                </Text>
                <Kbd>K</Kbd>
              </Group>
              <Button
                variant="subtle"
                size="xs"
                color="gray"
                onClick={() => setSearchOpened(false)}
              >
                Esc
              </Button>
            </Group>
            <ScrollArea h={rem(220)}>
              {filteredSpotlightActions.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No results. Try a different query.
                </Text>
              ) : (
                <Stack gap="xs">
                  {filteredSpotlightActions.map((action, index) => (
                    <Paper
                      key={index}
                      withBorder
                      radius="sm"
                      p="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        action.onClick()
                        setSearchOpened(false)
                        setSearchQuery('')
                      }}
                    >
                      <Group gap="sm">
                        {action.icon}
                        <Text size="sm">{action.label}</Text>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </ScrollArea>
          </Stack>
        </Paper>
      )}

      <Container size="xl" p="xl">
        <Box
          style={{
            display: 'flex',
            gap: rem(24),
            minHeight: 'calc(100vh - 4rem)',
          }}
        >
          {/* Sidebar */}
          <Stack
            p="lg"
            bg="white"
            style={{
              width: rem(280),
              flexShrink: 0,
              border: '1px solid var(--mantine-color-gray-2)',
              borderRadius: rem(8),
              height: 'fit-content',
              position: 'sticky',
              top: rem(80),
            }}
            gap="lg"
          >
            <Group gap="sm">
              <Avatar
                color="blue"
                radius="xl"
                size="md"
                style={{
                  border: '2px solid var(--mantine-color-gray-2)',
                }}
              >
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
              <Box style={{ flex: 1 }}>
                <Text fw={500} size="sm">
                  {user.name || 'User'}
                </Text>
                <Text size="xs" c="dimmed">
                  {user.email || 'No email'}
                </Text>
              </Box>
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <IconChevronDown size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Account</Menu.Label>
                  <Menu.Item leftSection={<IconUser size={16} />}>
                    Profile
                  </Menu.Item>
                  <Menu.Item leftSection={<IconSettings size={16} />}>
                    Settings
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            <Divider />

            <SegmentedControl
              value={sidebarTab}
              onChange={setSidebarTab}
              data={[
                {
                  value: 'activity',
                  label: (
                    <Group gap="xs">
                      <IconClock size={16} />
                      <Text size="sm">Activity</Text>
                    </Group>
                  ),
                },
                {
                  value: 'settings',
                  label: (
                    <Group gap="xs">
                      <IconSettings size={16} />
                      <Text size="sm">Settings</Text>
                    </Group>
                  ),
                },
              ]}
              fullWidth
              radius="md"
            />

            <ScrollArea h={rem(300)}>
              {sidebarTab === 'activity' && (
                <Stack gap="xs">
                  {recentActivity.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No recent activity
                    </Text>
                  ) : (
                    recentActivity.map((a) => (
                      <Paper key={a.id} p="sm" radius="md" withBorder>
                        <Stack gap="xs">
                          <Text size="sm">
                            File{' '}
                            <Text span fw={600}>
                              {a.target}
                            </Text>{' '}
                            was {a.action}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {a.time}
                          </Text>
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              )}
              {sidebarTab === 'settings' && (
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Preferences
                  </Text>
                  <Button size="sm" variant="light" fullWidth>
                    Customize Dashboard
                  </Button>
                </Stack>
              )}
            </ScrollArea>

            <Divider />

            <Group gap="xs">
              {quickActions.map((qa, i) => (
                <Tooltip key={i} label={qa.label} withArrow>
                  <ActionIcon
                    size="lg"
                    variant="light"
                    color="blue"
                    onClick={qa.onClick}
                  >
                    {qa.icon}
                  </ActionIcon>
                </Tooltip>
              ))}
            </Group>
          </Stack>

          {/* Main dashboard area */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Stack gap="xl">
              {/* Header */}
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Box>
                  <Text fw={900} size={rem(32)} mb="xs">
                    Dashboard
                  </Text>
                  <Text c="dimmed" size="sm" mb="md">
                    Manage your files and data tables
                  </Text>
                  <Group gap="sm">
                    <Badge
                      color="blue"
                      variant="light"
                      size="sm"
                      leftSection={<IconDatabase size={12} />}
                    >
                      {processed} processed
                    </Badge>
                    <Badge color="gray" variant="outline" size="sm">
                      {total} total files
                    </Badge>
                  </Group>
                </Box>
                <Button
                  size="md"
                  leftSection={<IconUpload size={18} />}
                  onClick={() => setUploadModalOpened(true)}
                >
                  Upload File
                </Button>
              </Group>

              {/* Notifications */}
              {notifications.length > 0 && (
                <Stack gap="sm">
                  {notifications.map((n) => (
                    <Alert
                      key={n.id}
                      icon={n.icon}
                      color={n.color}
                      title={n.title}
                      radius="md"
                    >
                      <Text size="sm">{n.description}</Text>
                    </Alert>
                  ))}
                </Stack>
              )}

              {/* Analytics cards */}
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                {analytics.map((stat, idx) => (
                  <Card
                    key={idx}
                    withBorder
                    shadow="sm"
                    radius="md"
                    p="lg"
                    style={{ backgroundColor: 'white' }}
                  >
                    <Group gap="sm" mb="xs">
                      <ThemeIcon
                        color={stat.accent}
                        size="lg"
                        radius="md"
                        variant="light"
                      >
                        <stat.icon size={20} />
                      </ThemeIcon>
                      <Text size={rem(24)} fw={700}>
                        {stat.value}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {stat.title}
                    </Text>
                  </Card>
                ))}
              </SimpleGrid>

              {/* Progress */}
              {total > 0 && (
                <Card withBorder shadow="sm" radius="md" p="md" bg="white">
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <IconChartBar size={18} />
                      <Text size="sm" fw={600}>
                        Processing Progress
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {processed} of {total} files processed
                    </Text>
                  </Group>
                  <Progress value={percent} size="md" radius="md" />
                </Card>
              )}

              {/* Files and Trending */}
              <Group align="flex-start" gap="md" wrap="nowrap">
                {/* Uploaded Files */}
                <Card
                  withBorder
                  shadow="sm"
                  radius="md"
                  p="lg"
                  style={{ flex: 2, backgroundColor: 'white', minWidth: 0 }}
                >
                  <Group justify="space-between" mb="md">
                    <Text size="lg" fw={700}>
                      Uploaded Files
                    </Text>
                    <Button
                      variant="outline"
                      size="xs"
                      leftSection={<IconUpload size={14} />}
                      onClick={() => setUploadModalOpened(true)}
                    >
                      New Upload
                    </Button>
                  </Group>
                  {files.length === 0 ? (
                    <Box py="xl" ta="center">
                      <IconFile size={48} color="var(--mantine-color-gray-4)" />
                      <Text c="dimmed" mt="md" size="sm">
                        No files yet. Upload your first file!
                      </Text>
                    </Box>
                  ) : (
                    <Stack gap="sm">
                      {files.map((file) => (
                        <Paper
                          key={file._id}
                          p="md"
                          radius="md"
                          withBorder
                          style={{
                            backgroundColor: 'var(--mantine-color-gray-0)',
                          }}
                        >
                          <Stack gap="sm">
                            <Group
                              gap="sm"
                              justify="space-between"
                              wrap="nowrap"
                            >
                              <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                <ThemeIcon color="blue" size="md" radius="md">
                                  <IconFile size={18} />
                                </ThemeIcon>
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                  <Text
                                    size="sm"
                                    fw={600}
                                    style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {file.fileName}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {formatFileSize(file.fileSize)} •{' '}
                                    {new Date(
                                      file.uploadedAt,
                                    ).toLocaleDateString()}
                                  </Text>
                                </Box>
                              </Group>
                              {file.duckdbProcessed && (
                                <Badge
                                  size="sm"
                                  leftSection={<IconDatabase size={12} />}
                                  color="green"
                                  variant="light"
                                >
                                  {file.duckdbTableName}
                                </Badge>
                              )}
                            </Group>
                            <Group gap="xs">
                              {file.duckdbProcessed && (
                                <Button
                                  size="xs"
                                  variant="light"
                                  component="a"
                                  href={`/table/${encodeURIComponent(file.duckdbTableName!)}`}
                                  leftSection={<IconDatabase size={14} />}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Table
                                </Button>
                              )}
                              <CopyButton value={file.fileName}>
                                {({ copied, copy }) => (
                                  <Tooltip
                                    label={copied ? 'Copied!' : 'Copy filename'}
                                    withArrow
                                  >
                                    <ActionIcon
                                      color={copied ? 'green' : 'gray'}
                                      variant="subtle"
                                      onClick={copy}
                                    >
                                      <IconCopy size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </CopyButton>
                              <Tooltip label="Delete file" withArrow>
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() =>
                                    void deleteFile({ fileId: file._id })
                                  }
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Card>

                {/* Trending Files */}
                {trendingFiles.length > 0 && (
                  <Card
                    withBorder
                    shadow="sm"
                    radius="md"
                    p="lg"
                    style={{
                      width: rem(300),
                      flexShrink: 0,
                      backgroundColor: 'white',
                    }}
                  >
                    <Group justify="space-between" mb="md">
                      <Text fw={700} size="md">
                        Recent Tables
                      </Text>
                      <ThemeIcon
                        color="teal"
                        size="sm"
                        radius="md"
                        variant="light"
                      >
                        <IconStar size={14} />
                      </ThemeIcon>
                    </Group>
                    <Divider mb="md" />
                    <Stack gap="xs">
                      {trendingFiles.map((f) => (
                        <Group key={f._id} gap="sm" wrap="nowrap">
                          <ThemeIcon
                            color="blue"
                            size="sm"
                            radius="md"
                            variant="light"
                          >
                            <IconFile size={12} />
                          </ThemeIcon>
                          <Text
                            size="sm"
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {f.fileName}
                          </Text>
                          <Badge color="green" size="xs" variant="light">
                            Table
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Card>
                )}
              </Group>
            </Stack>
          </Box>
        </Box>
      </Container>

      <Modal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        title={
          <Text size="xl" fw={600}>
            Upload Files
          </Text>
        }
        size="lg"
        centered
      >
        <Text size="sm" c="dimmed" mb="md">
          Upload CSV files to get started
        </Text>
        <FileUpload onUploadComplete={handleUploadComplete} />
      </Modal>
    </Box>
  )
}
