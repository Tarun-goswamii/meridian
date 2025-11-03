import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { Group, Text, rem, Stack, Card, Box, Progress } from '@mantine/core'
import { IconUpload, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { api } from '@/convex/_generated/api'
import { notifications } from '@mantine/notifications'
import { useMutation } from 'convex/react'

interface FileUploadProps {
  onUploadComplete?: () => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Mutation to generate upload URL
  const generateUploadUrl = useMutation(api.csv.generateUploadUrl)

  // Mutation to save file metadata
  const saveFile = useMutation(api.csv.saveFile)

  const handleDrop = async (acceptedFiles: File[]) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      for (const file of acceptedFiles) {
        // Generate upload URL
        const uploadUrl = await generateUploadUrl({})
        setUploadProgress(30)

        // Upload file to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        setUploadProgress(70)

        const { storageId } = await uploadResponse.json()

        // Save file metadata
        await saveFile({
          storageId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        })
        setUploadProgress(100)
      }

      notifications.show({
        title: 'Upload Successful',
        message: 'Your file(s) have been uploaded successfully',
        color: 'green',
      })

      // Call the callback if provided
      onUploadComplete?.()
    } catch (error) {
      console.error('Upload error:', error)
      notifications.show({
        title: 'Upload Failed',
        message:
          error instanceof Error ? error.message : 'Failed to upload file',
        color: 'red',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Stack gap="lg">
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Dropzone
          onDrop={handleDrop}
          onReject={() => {
            notifications.show({
              title: 'Invalid File',
              message: 'Please upload valid files',
              color: 'red',
            })
          }}
          maxSize={10 * 1024 ** 2} // 10MB
          accept={[MIME_TYPES.csv, MIME_TYPES.xlsx, MIME_TYPES.xls]}
          loading={uploading}
        >
          <Group
            justify="center"
            gap="xl"
            mih={220}
            style={{ pointerEvents: 'none' }}
          >
            <Dropzone.Accept>
              <IconUpload
                style={{
                  width: rem(52),
                  height: rem(52),
                  color: 'var(--mantine-color-blue-6)',
                }}
                stroke={1.5}
              />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX
                style={{
                  width: rem(52),
                  height: rem(52),
                  color: 'var(--mantine-color-red-6)',
                }}
                stroke={1.5}
              />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconUpload
                style={{
                  width: rem(52),
                  height: rem(52),
                  color: 'var(--mantine-color-dimmed)',
                }}
                stroke={1.5}
              />
            </Dropzone.Idle>

            <div>
              <Text size="xl" inline>
                {'Drag files here or click to select'}
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                Attach CSV, XLSX, or XLS files (max 10MB each)
              </Text>
            </div>
          </Group>
        </Dropzone>

        {uploading && (
          <Box mt="md">
            <Text size="sm" mb="xs">
              Uploading... {uploadProgress}%
            </Text>
            <Progress value={uploadProgress} animated />
          </Box>
        )}
      </Card>
    </Stack>
  )
}
