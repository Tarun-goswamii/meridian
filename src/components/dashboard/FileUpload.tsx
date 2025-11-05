import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import { Group, Text, rem, Stack, Card, Box, Progress } from '@mantine/core'
import { IconUpload, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { api } from '@/convex/_generated/api'
import { notifications } from '@mantine/notifications'
import { useMutation } from 'convex/react'
import { createTableFromCSV } from '@/src/utils/duckdb'
import { ConvexClient } from 'convex/browser'

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

  // Mutation to update DuckDB info
  const updateDuckDBInfo = useMutation(api.csv.updateDuckDBInfo)

  const handleDrop = async (acceptedFiles: File[]) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      // Get Convex URL from environment
      const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
      const convexClient = new ConvexClient(CONVEX_URL)

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
        setUploadProgress(60)

        const { storageId } = await uploadResponse.json()

        // Save file metadata
        const fileId = await saveFile({
          storageId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        })
        setUploadProgress(70)

        // Only process CSV files with DuckDB
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          try {
            // Get the file URL from Convex storage
            const csvUrl = await convexClient.query(api.csv.getFileUrl, {
              storageId,
            })

            if (!csvUrl) {
              throw new Error('Failed to get CSV URL from Convex storage')
            }

            // Create DuckDB table
            const tableName = file.name
              .replace(/\.csv$/i, '')
              .replace(/[^a-zA-Z0-9_]/g, '_')
              .toLowerCase()

            setUploadProgress(80)

            const result = await createTableFromCSV({
              data: {
                csvUrl,
                tableName,
              },
            })

            setUploadProgress(90)

            // Update file record with DuckDB table name
            await updateDuckDBInfo({
              fileId,
              tableName: result.tableName,
            })

            console.log(
              `DuckDB table created: ${result.tableName} with ${result.rowCount} rows`,
            )

            notifications.show({
              title: 'CSV Processed',
              message: `Created DuckDB table "${result.tableName}" with ${result.rowCount} rows`,
              color: 'blue',
            })
          } catch (duckdbError) {
            console.error('DuckDB processing error:', duckdbError)
            // Don't fail the entire upload if DuckDB processing fails
            notifications.show({
              title: 'Warning',
              message: 'File uploaded but DuckDB table creation failed',
              color: 'yellow',
            })
          }
        }

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
