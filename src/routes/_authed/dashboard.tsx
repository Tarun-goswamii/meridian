import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/src/components/Navbar'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@/convex/_generated/api'
import FileUpload from './components/FileUpload'
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
} from '@mantine/core'
import { IconFile, IconTrash, IconUpload } from '@tabler/icons-react'
import { useMutation } from 'convex/react'
import { useState } from 'react'

export const Route = createFileRoute('/_authed/dashboard')({
  component: Home,
})

function Home() {
  const [uploadModalOpened, setUploadModalOpened] = useState(false)

  // Query to get uploaded files
  const { data: files = [] } = useQuery(convexQuery(api.csv.getFiles, {}))

  // Mutation to delete file
  const deleteFile = useMutation(api.csv.deleteFile)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleUploadComplete = () => {
    setUploadModalOpened(false)
  }

  return (
    <div>
      <Navbar />
      {files.length === 0 ? (
        <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <Stack gap="xl" align="center" style={{ marginTop: '4rem' }}>
            <div style={{ textAlign: 'center' }}>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                }}
              >
                Welcome to your Dashboard
              </h1>
              <Text size="lg" c="dimmed">
                Get started by uploading your first file
              </Text>
            </div>
            <Button
              size="lg"
              leftSection={<IconUpload size={20} />}
              onClick={() => setUploadModalOpened(true)}
            >
              Upload File
            </Button>
          </Stack>
        </main>
      ) : (
        <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <Group justify="space-between" mb="xl">
            <div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                }}
              >
                Dashboard
              </h1>
              <Text c="dimmed">Manage your uploaded files</Text>
            </div>
            <Button
              leftSection={<IconUpload size={18} />}
              onClick={() => setUploadModalOpened(true)}
            >
              Upload New File
            </Button>
          </Group>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="lg" fw={500} mb="md">
              Uploaded Files
            </Text>

            <List spacing="sm" style={{ display: 'flex', flexWrap: 'wrap' }}>
              {files.map((file) => (
                <List.Item
                  key={file._id}
                  style={{
                    border: '2px solid #eee',
                    borderRadius: 4,
                    padding: 10,
                  }}
                  icon={
                    <ThemeIcon color="blue" size={24} radius="xl">
                      <IconFile size={16} />
                    </ThemeIcon>
                  }
                >
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={500}>
                        {file.fileName}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatFileSize(file.fileSize)} •{' '}
                        {new Date(file.uploadedAt).toLocaleString()}
                      </Text>
                    </div>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => void deleteFile({ fileId: file._id })}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </List.Item>
              ))}
            </List>
          </Card>
        </main>
      )}

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
    </div>
  )
}
