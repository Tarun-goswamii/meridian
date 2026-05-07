import { Dropzone, MIME_TYPES } from '@mantine/dropzone'
import {
  Group,
  Text,
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

interface FileUploadProps {
  onUploadComplete?: () => void
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeTab, setActiveTab] = useState<string | null>('file')
  const [url, setUrl] = useState('')
  const [prompt, setPrompt] = useState('')

  // Mutation to save file metadata
  const saveFile = useMutation(api.csv.saveFile)

  // Mutation to update DuckDB info
  const updateDuckDBInfo = useMutation(api.csv.updateDuckDBInfo)

  // Action to create table from URL
  const createTableFromURL = useAction(api.actions.csvActions.createTableFromURL)

  const handleURLSubmit = async () => {
    if (!url) {
      notifications.show({
        title: 'Missing URL',
        message: 'Please enter a URL to extract data from',
        color: 'red',
      })
      return
    }

    if (!prompt) {
      notifications.show({
        title: 'Missing Prompt',
        message: 'Please provide an extraction prompt',
        color: 'red',
      })
      return
    }

    setUploading(true)
    setUploadProgress(5)

    try {
      setUploadProgress(20)
      // Call server action to extract JSON from the URL
      const extractResult = await createTableFromURL({ url, prompt })
      setUploadProgress(50)

      if (!extractResult || !extractResult.data) {
        throw new Error('No data returned from extraction')
      }

      // Create DuckDB table from JSON data
      const jsonCreateResult = await createTableFromJSON({
        data: extractResult.data,
        tableName: extractResult.tableName,
      })

      setUploadProgress(85)

      // Update file record with DuckDB table name (if file was created server-side)
      if (extractResult.fileId) {
        await updateDuckDBInfo({
          fileId: extractResult.fileId,
          tableName: jsonCreateResult.tableName,
        })
      }

      setUploadProgress(100)

      notifications.show({
        title: 'Extraction Successful',
        message: `Created DuckDB table "${jsonCreateResult.tableName}" with ${jsonCreateResult.rowCount} rows`,
        color: 'green',
      })

      onUploadComplete?.()
    } catch (error) {
      console.error('URL extraction error:', error)
      notifications.show({
        title: 'Extraction Failed',
        message: error instanceof Error ? error.message : 'Failed to extract data from URL',
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
      for (const file of acceptedFiles) {
        setUploadProgress(20)

        // Read file as text
        const fileContent = await file.text()
        setUploadProgress(40)

        // Save file with content directly in Convex
        const fileId = await saveFile({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileContent, // Store CSV content directly
        })
        setUploadProgress(65)

        // Only process CSV files with DuckDB
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          try {
            // Create DuckDB table
            const tableName = file.name
              .replace(/\.csv$/i, '')
              .replace(/[^a-zA-Z0-9_]/g, '_')
              .toLowerCase()

            setUploadProgress(85)

            const result = await createTableFromCSV({
              data: {
                csvContent: fileContent,
                tableName,
              },
            })

            setUploadProgress(95)

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
                  message: 'Please upload a valid CSV file',
                  color: 'red',
                })
              }}
              maxSize={10 * 1024 ** 2} // 10MB
              accept={[MIME_TYPES.csv]}
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
                    Attach CSV files (max 10MB each)
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
