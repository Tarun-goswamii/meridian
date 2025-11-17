import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import {
  Group,
  Text,
  rem,
  Stack,
  Card,
  Box,
  Progress,
  Tabs,
  TextInput,
  Textarea,
  Button,
} from '@mantine/core'
import { IconUpload, IconX, IconLink } from '@tabler/icons-react'
import { useState } from 'react'
import { api } from '@/convex/_generated/api'
import { notifications } from '@mantine/notifications'
import { useMutation, useAction } from 'convex/react'
import { createTableFromJSON, createTableFromCSV } from '@/src/utils/duckdb'
import { ConvexClient } from 'convex/browser'

interface FileUploadProps {
  onUploadComplete?: () => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<string | null>('file')
  const [url, setUrl] = useState('')
  const [prompt, setPrompt] = useState('')

  // Mutation to generate upload URL
  const generateUploadUrl = useMutation(api.csv.generateUploadUrl)

  // Mutation to save file metadata
  const saveFile = useMutation(api.csv.saveFile)

  // Mutation to update DuckDB info
  const updateDuckDBInfo = useMutation(api.csv.updateDuckDBInfo)

  // Action to create table from URL
  const createTableFromURL = useAction(api.csv.createTableFromURL)

  const handleURLSubmit = async () => {
    if (!url.trim()) {
      notifications.show({
        title: 'Invalid URL',
        message: 'Please enter a valid URL',
        color: 'red',
      })
      return
    }

    if (!prompt.trim()) {
      notifications.show({
        title: 'Prompt Required',
        message: 'Please enter a prompt describing what data to extract',
        color: 'red',
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      setUploadProgress(20)

      // Call the action to extract data and create CSV
      const result = await createTableFromURL({
        url: url.trim(),
        prompt: prompt.trim(),
      })

      setUploadProgress(60)

      if (!result.success || !result.data) {
        throw new Error('Failed to extract data from URL')
      }

      // Create DuckDB table directly from JSON data
      const tableResult = await createTableFromJSON({
        data: {
          data: result.data,
          tableName: result.tableName,
        },
      })

      setUploadProgress(90)

      // Update file record with DuckDB table name
      await updateDuckDBInfo({
        fileId: result.fileId,
        tableName: tableResult.tableName,
      })

      console.log(
        `DuckDB table created: ${tableResult.tableName} with ${tableResult.rowCount} rows`,
      )

      notifications.show({
        title: 'Table Created',
        message: `Created DuckDB table "${tableResult.tableName}" with ${tableResult.rowCount} rows from URL`,
        color: 'green',
      })

      setUploadProgress(100)

      // Reset form
      setUrl('')
      setPrompt('')

      // Call the callback if provided
      onUploadComplete?.()
    } catch (error) {
      console.error('URL extraction error:', error)
      notifications.show({
        title: 'Extraction Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to extract data from URL',
        color: 'red',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

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
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="file" leftSection={<IconUpload size={16} />}>
            Upload File
          </Tabs.Tab>
          <Tabs.Tab value="url" leftSection={<IconLink size={16} />}>
            From URL
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="file" pt="md">
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
                      width: 24,
                      height: 24,
                      color: 'var(--mantine-color-blue-6)',
                    }}
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    style={{
                      width: 24,
                      height: 24,
                      color: 'var(--mantine-color-red-6)',
                    }}
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconUpload
                    style={{
                      width: 24,
                      height: 24,
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
        </Tabs.Panel>

        <Tabs.Panel value="url" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                label="URL"
                placeholder="https://example.com/page"
                value={url}
                onChange={(e) => setUrl(e.currentTarget.value)}
                disabled={uploading}
                required
                description="Enter the URL of the webpage to extract data from"
              />
              <Textarea
                label="Extraction Prompt"
                placeholder="Extract all product information including name, price, and description..."
                value={prompt}
                onChange={(e) => setPrompt(e.currentTarget.value)}
                disabled={uploading}
                required
                minRows={3}
                description="Describe what data you want to extract from the webpage. Firecrawl will use this prompt to extract structured data."
              />
              <Button
                onClick={handleURLSubmit}
                loading={uploading}
                leftSection={<IconLink size={18} />}
                fullWidth
              >
                Extract Data & Create Table
              </Button>

              {uploading && (
                <Box mt="md">
                  <Text size="sm" mb="xs">
                    Extracting data... {uploadProgress}%
                  </Text>
                  <Progress value={uploadProgress} animated />
                </Box>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
