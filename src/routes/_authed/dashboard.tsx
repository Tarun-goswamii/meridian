import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/src/components/Navbar'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import FileUpload from '../../components/dashboard/FileUpload'
import {
  Group,
  Text,
  Card,
  List,
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
} from '@mantine/core'
import {
  IconFile,
  IconTrash,
  IconUpload,
  IconDatabase,
  IconUser,
  IconChevronDown,
  IconPlaylistAdd,
  IconCopy,
  IconAlertCircle,
  IconBell,
  IconSettings,
  IconChartBar,
  IconStar,
  IconSearch,
  IconClock,
  IconUsers,
  IconDeviceAnalytics,
  IconCheck,
  IconBook,
} from '@tabler/icons-react'
import { useMutation } from 'convex/react'
import { useEffect, useState } from 'react'

function getRandomAvatar() {
  const avatars = [
    'https://randomuser.me/api/portraits/men/45.jpg',
    'https://randomuser.me/api/portraits/women/44.jpg',
    'https://randomuser.me/api/portraits/men/30.jpg',
    'https://randomuser.me/api/portraits/women/65.jpg',
    'https://randomuser.me/api/portraits/men/34.jpg',
    'https://randomuser.me/api/portraits/women/16.jpg',
    'https://randomuser.me/api/portraits/men/57.jpg',
  ]
  return avatars[Math.floor(Math.random() * avatars.length)]
}

export const Route = createFileRoute('/_authed/dashboard')({
  component: Home,
})

function Home() {
  const [uploadModalOpened, setUploadModalOpened] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('activity')
  const [searchOpened, setSearchOpened] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Pretend analytics data
  const analytics = [
    {
      title: 'Files Uploaded',
      value: files.length,
      icon: <IconUpload size={22} color="#1971c2" />,
      accent: 'blue',
    },
    {
      title: 'Active Users',
      value: 7,
      icon: <IconUsers size={22} color="#228be6" />,
      accent: 'indigo',
    },
    {
      title: 'Total Tables',
      value: files.filter((f) => f.duckdbProcessed).length,
      icon: <IconDatabase size={22} color="#2f9e44" />,
      accent: 'green',
    },
    {
      title: 'Processing',
      value: files.filter((f) => !f.duckdbProcessed).length,
      icon: <IconDeviceAnalytics size={22} color="#e8590c" />,
      accent: 'orange',
    },
  ]

  const fakeRecentActivity = [
    {
      id: 1,
      user: 'Jane Doe',
      avatar: getRandomAvatar(),
      action: 'uploaded a new file',
      target: 'sales-q2.xlsx',
      time: '2m ago',
    },
    {
      id: 2,
      user: 'Mike Smith',
      avatar: getRandomAvatar(),
      action: 'deleted file',
      target: 'analytics.csv',
      time: '20m ago',
    },
    {
      id: 3,
      user: 'You',
      avatar: getRandomAvatar(),
      action: 'created a table',
      target: 'invoices_2024',
      time: 'an hour ago',
    },
  ]

  const trendingFiles = files.slice(0, 3)

  const handleUploadComplete = () => {
    setUploadModalOpened(false)
  }

  // FAKE notifications
  const fakeNotifications = [
    {
      id: 1,
      title: 'Your import was successful!',
      description: 'File data2024.xlsx is now available as a table.',
      icon: <IconCheck size={18} color="#2f9e44" />,
      color: 'green',
    },
    {
      id: 2,
      title: 'Error processing market.csv',
      description: 'Please try again later.',
      icon: <IconAlertCircle size={18} color="#c92a2a" />,
      color: 'red',
    },
  ]

  // Quick actions
  const quickActions = [
    {
      label: 'Upload File',
      icon: <IconUpload size={18} />,
      onClick: () => setUploadModalOpened(true),
    },
    {
      label: 'Create Table',
      icon: <IconPlaylistAdd size={18} />,
      onClick: () => alert('Not implemented!'),
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

  // For fake progress
  const total = files.length + 5
  const processed = files.filter((f) => f.duckdbProcessed).length
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((processed / total) * 100))

  return (
    <Box style={{ minHeight: '100vh', backgroundColor: '#f6f8fa' }}>
      <Navbar />
      {/* Spotlight / Command Palette */}
      <Paper
        shadow="sm"
        p={12}
        radius="md"
        style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: 340,
          maxWidth: 560,
          width: '100%',
          zIndex: 500,
          backgroundColor: 'white',
          border: '1px solid #ececec',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          display: searchOpened ? 'block' : 'none',
        }}
      >
        <Stack gap={8}>
          <Group gap={8} align="center">
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
                or
              </Text>
              <Kbd>Cmd</Kbd>
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
          <ScrollArea h={220}>
            {filteredSpotlightActions.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py={6}>
                No results. Try a different query.
              </Text>
            ) : (
              <Stack gap={4}>
                {filteredSpotlightActions.map((action, index) => (
                  <Paper
                    key={index}
                    withBorder
                    radius="sm"
                    p={6}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      action.onClick()
                      setSearchOpened(false)
                      setSearchQuery('')
                    }}
                  >
                    <Group gap={8}>
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

      <Box
        style={{
          display: 'flex',
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        {/* Sidebar */}
        <Stack
          p="md"
          bg="white"
          style={{
            width: 270,
            flexShrink: 0,
            height: 'calc(100vh - 60px)',
            borderRight: '1px solid #eee',
            position: 'sticky',
            top: 60,
            alignSelf: 'flex-start',
            zIndex: 20,
            boxShadow: '0 1px 1px rgba(22,22,22,0.02)',
            overflowY: 'auto',
          }}
          gap="xl"
        >
          <Group align="center" gap="xs">
            <Avatar src={getRandomAvatar()} radius="xl" />
            <Box>
              <Text fw={500}>Welcome back</Text>
              <Text size="xs" c="dimmed">
                {['You', 'Jane Doe', 'Mike'].sort(() => Math.random() - 0.5)[0]}
              </Text>
            </Box>
            <Menu shadow="xs" position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="light" color="dark">
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
                <Menu.Divider />
                <Menu.Item color="red">Logout</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          <Divider mb={0} />
          <SegmentedControl
            value={sidebarTab}
            onChange={setSidebarTab}
            data={[
              {
                value: 'activity',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconClock size={16} />
                    Activity
                  </div>
                ),
              },
              {
                value: 'settings',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconSettings size={16} />
                    Settings
                  </div>
                ),
              },
            ]}
            fullWidth
            radius="md"
            style={{ marginBottom: 6 }}
          />
          {/* Demo: Activity feed/faux notifications */}
          <ScrollArea h={270}>
            {sidebarTab === 'activity' && (
              <Stack gap="xs">
                {fakeRecentActivity.map((a) => (
                  <Paper key={a.id} shadow="xs" p={10} radius="md" withBorder>
                    <Group align="center">
                      <Avatar src={a.avatar} radius="xl" size={32} />
                      <Text size="sm">
                        <b>{a.user}</b> {a.action} <b>{a.target}</b>
                      </Text>
                      <Text size="xs" c="dimmed" ml="auto">
                        {a.time}
                      </Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
            {sidebarTab === 'starred' && (
              <Text c="dimmed" size="sm" ta="center">
                No starred items yet.
              </Text>
            )}
            {sidebarTab === 'settings' && (
              <Stack>
                <Text size="sm" fw={600}>
                  User Preferences
                </Text>
                <Button size="xs" variant="light" color="dark">
                  Customize Dashboard
                </Button>
                <Button size="xs" variant="light" color="red">
                  Delete Account
                </Button>
              </Stack>
            )}
          </ScrollArea>
          <Divider />
          <Group gap={8}>
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
        <Box
          style={{
            flex: 1,
            padding: '28px 24px 32px',
            minWidth: 0,
            maxWidth: 'calc(100vw - 270px)',
          }}
        >
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Box>
                <Text
                  fw={900}
                  size="2.1rem"
                  style={{ letterSpacing: -1, marginBottom: -8 }}
                >
                  Dashboard
                </Text>
                <Text c="dimmed" size="md" mb="xs">
                  Visualize & manage your files, tables, users
                </Text>
                <Group gap={8}>
                  <Badge
                    color="teal"
                    variant="light"
                    size="sm"
                    leftSection={<IconBell size={12} />}
                  >
                    New
                  </Badge>
                  <Badge
                    color="indigo"
                    variant="light"
                    size="sm"
                    leftSection={<IconDatabase size={12} />}
                  >
                    {processed} processed
                  </Badge>
                  <Badge color="gray" variant="outline" size="sm">
                    {files.length} total files
                  </Badge>
                </Group>
              </Box>
              <Button
                size="md"
                color="blue"
                leftSection={<IconUpload size={20} />}
                onClick={() => setUploadModalOpened(true)}
              >
                Upload File
              </Button>
            </Group>

            {/* Notification fake alert */}
            <Group gap="xs" wrap="wrap">
              {fakeNotifications.map((n, idx) => (
                <Alert
                  key={idx}
                  icon={n.icon}
                  color={n.color}
                  title={n.title}
                  radius="md"
                  style={{ flex: 1 }}
                >
                  <Group gap={8} align="center">
                    <Text size="sm">{n.description}</Text>
                    <Button size="xs" variant="light" color="gray">
                      Dismiss
                    </Button>
                  </Group>
                </Alert>
              ))}
            </Group>

            {/* Analytics cards */}
            <Group gap="md" align="stretch" wrap="wrap">
              {analytics.map((stat, idx) => (
                <Card
                  key={idx}
                  withBorder
                  w={220}
                  shadow="xs"
                  radius="lg"
                  p="md"
                  style={{ flex: 1, background: 'white' }}
                >
                  <Group align="center" gap="xs" mb="xs">
                    <ThemeIcon
                      color={stat.accent}
                      size="lg"
                      radius="xl"
                      variant="light"
                    >
                      {stat.icon}
                    </ThemeIcon>
                    <Text size="lg" fw={700}>
                      {stat.value}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {stat.title}
                  </Text>
                </Card>
              ))}
            </Group>

            {/* Progress to next milestone */}
            <Box mb="md">
              <Group gap={8} align="center">
                <Text size="sm" fw={600}>
                  File Processing Progress
                </Text>
                <IconChartBar size={18} color="#1971c2" />
                <Text size="xs" c="dimmed">
                  {processed} of {total} done
                </Text>
              </Group>
              <Progress value={percent} size="xs" mt={6} radius="lg" />
            </Box>

            <Group gap="md" align="flex-start" wrap="nowrap">
              {/* Uploaded Files List */}
              <Card
                shadow="sm"
                radius="md"
                withBorder
                style={{
                  flex: 2,
                  backgroundColor: 'white',
                  minWidth: 0,
                  overflow: 'auto',
                }}
                p="md"
              >
                <Group justify="space-between" mb="md">
                  <Text size="lg" fw={700}>
                    Uploaded Files
                  </Text>
                  <Button
                    variant="outline"
                    size="xs"
                    leftSection={<IconUpload size={15} />}
                    onClick={() => setUploadModalOpened(true)}
                  >
                    New Upload
                  </Button>
                </Group>
                {files.length === 0 ? (
                  <Text c="dimmed" ta="center" py="lg">
                    No files yet. Upload your first file!
                  </Text>
                ) : (
                  <List style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {files.map((file) => (
                      <List.Item
                        key={file._id}
                        style={{
                          border: '2px solid #eee',
                          borderRadius: 6,
                          padding: 12,
                          minWidth: 230,
                          background: '#fafdff',
                          marginBottom: 9,
                        }}
                        icon={
                          <ThemeIcon color="blue" size={28} radius="xl">
                            <IconFile size={18} />
                          </ThemeIcon>
                        }
                      >
                        <Stack gap={3} style={{ minHeight: 64 }}>
                          <Group gap={6} align="center">
                            <Text
                              size="sm"
                              fw={600}
                              style={{
                                flex: 1,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.fileName}
                            </Text>
                            {file.duckdbProcessed && (
                              <Badge
                                size="xs"
                                leftSection={<IconDatabase size={12} />}
                                color="green"
                                variant="light"
                              >
                                {file.duckdbTableName}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="dimmed">
                            {formatFileSize(file.fileSize)} •{' '}
                            {new Date(file.uploadedAt).toLocaleString()}
                          </Text>
                          <Group gap="xs">
                            <Tooltip label="Open Table" withArrow>
                              <Button
                                size="xs"
                                variant="light"
                                color={file.duckdbProcessed ? 'blue' : 'gray'}
                                component="a"
                                disabled={!file.duckdbProcessed}
                                href={
                                  file.duckdbProcessed
                                    ? `/table/${encodeURIComponent(file.duckdbTableName!)}`
                                    : undefined
                                }
                                target="_blank"
                              >
                                View Table
                              </Button>
                            </Tooltip>
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
                                    <IconCopy size={18} />
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
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Stack>
                      </List.Item>
                    ))}
                  </List>
                )}
              </Card>

              {/* "Trending uploads" / fake widgets column */}
              <Stack gap="md" style={{ flex: 1, minWidth: 300 }}>
                {/* Trending Cards */}
                <Card
                  withBorder
                  radius="md"
                  shadow="xs"
                  p="md"
                  style={{ background: 'white' }}
                >
                  <Group justify="space-between" mb={4}>
                    <Text fw={700} size="md">
                      Trending Uploads
                    </Text>
                    <ThemeIcon color="teal" size="sm" radius="xl">
                      <IconStar size={15} />
                    </ThemeIcon>
                  </Group>
                  <Divider mb="sm" />
                  <Stack gap={5}>
                    {trendingFiles.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center">
                        No uploads yet
                      </Text>
                    ) : (
                      trendingFiles.map((f) => (
                        <Group key={f._id}>
                          <ThemeIcon color="blue" size={18} radius="xl">
                            <IconFile size={13} />
                          </ThemeIcon>
                          <Text
                            size="sm"
                            style={{
                              flex: 1,
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {f.fileName}
                          </Text>
                          {f.duckdbProcessed ? (
                            <Badge color="green" size="xs">
                              Table
                            </Badge>
                          ) : (
                            <Badge color="yellow" size="xs">
                              Processing
                            </Badge>
                          )}
                        </Group>
                      ))
                    )}
                  </Stack>
                </Card>
                {/* Recent users */}
                <Card
                  withBorder
                  radius="md"
                  shadow="xs"
                  p="md"
                  style={{ background: 'white' }}
                >
                  <Group justify="space-between" mb={4}>
                    <Text fw={700} size="md">
                      Recent Collaborators
                    </Text>
                  </Group>
                  <Group>
                    {[...Array(4)].map((_, idx) => (
                      <Avatar
                        key={idx}
                        src={getRandomAvatar()}
                        radius="xl"
                        size="md"
                        style={{ border: '2px solid #B2B2B2' }}
                      />
                    ))}
                  </Group>
                </Card>
                {/* Calendar / fake */}
                <Card
                  withBorder
                  radius="md"
                  shadow="xs"
                  p="sm"
                  style={{ background: 'white' }}
                >
                  <Group gap={7}>
                    <IconClock size={18} color="#1971c2" />
                    <Text fw={600} size="sm">
                      Next Data Import
                    </Text>
                  </Group>
                  <Divider my={3} />
                  <Group gap={6}>
                    <Text c="dimmed" size="xs">
                      Scheduled for:
                    </Text>
                    <Badge color="gray" size="sm">
                      Monday, 10am
                    </Badge>
                  </Group>
                  <Button variant="light" size="xs" mt={6}>
                    View Schedule
                  </Button>
                </Card>
              </Stack>
            </Group>
          </Stack>
        </Box>
      </Box>

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
          Upload CSV, XLSX, or XLS files to get started
        </Text>
        <FileUpload onUploadComplete={handleUploadComplete} />
      </Modal>
    </Box>
  )
}
