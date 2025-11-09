import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Box,
  Text,
  ScrollArea,
  Button,
  Group,
  Badge,
  Tooltip,
  Stack,
  Divider,
  Paper,
  Code,
  Loader,
} from '@mantine/core'
import { IconCheck, IconX, IconHistory } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { queryDuckDB } from '~/utils/duckdb'
import { createTableFromCSV } from '~/utils/duckdb'

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface QueryTimelineProps {
  tableName: string
  onRollbackComplete?: () => void
}

// You may want to define a log type if not available
type LogType = {
  _id: string
  query: string
  success: boolean
  error?: string
  resultMetadata?: {
    rowCount?: number
    columnCount?: number
    executionTimeMs?: number
  }
  sequenceNumber: number
  executedAt: number
}

export function QueryTimeline({
  tableName,
  onRollbackComplete,
}: QueryTimelineProps) {
  const queryLogs = useQuery(api.queryLog.getQueryLogs, { limit: 100 })
  const fileInfo = useQuery(api.csv.getFileByTableName, { tableName })

  const [isRollingBack, setIsRollingBack] = useState<number | null>(null)
  const [rollbackSequenceNumber, setRollbackSequenceNumber] = useState<number | null>(null)

  const logs = useQuery(
    api.queryLog.getQueryLogsUpTo,
    rollbackSequenceNumber !== null ? { sequenceNumber: rollbackSequenceNumber } : 'skip'
  )

  useEffect(() => {
    if (
      logs &&
      rollbackSequenceNumber !== null &&
      isRollingBack !== null // prevent double-rollback if already finished
    ) {
      performRollback(
        logs as LogType[],
        rollbackSequenceNumber
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, rollbackSequenceNumber])

  if (queryLogs === undefined) {
    return (
      <Box p="md">
        <Group justify="center">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading query history...
          </Text>
        </Group>
      </Box>
    )
  }

  if (queryLogs.length === 0) {
    return (
      <Box p="md">
        <Text size="sm" c="dimmed">
          No queries executed yet
        </Text>
      </Box>
    )
  }

  const handleRollback = (sequenceNumber: number) => {
    if (!fileInfo) {
      alert('Original file not found. Cannot rollback.')
      return
    }
    setIsRollingBack(sequenceNumber)
    setRollbackSequenceNumber(sequenceNumber) // triggers the query
  }

  const performRollback = async (logs: LogType[], sequenceNumber: number) => {
    if (!fileInfo) {
      alert('Original file not found. Cannot rollback.')
      setIsRollingBack(null)
      setRollbackSequenceNumber(null)
      return
    }
    try {
      // Step 1: Recreate the table from the original CSV file
      const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')

      // Drop the existing table first
      await queryDuckDB({ data: `DROP TABLE IF EXISTS ${sanitizedTableName}` })

      // Recreate from CSV
      await createTableFromCSV({
        data: {
          csvUrl: fileInfo.url,
          tableName: sanitizedTableName,
        },
      })

      // Step 2: Replay queries in sequence
      let successCount = 0
      let failureCount = 0

      for (const log of logs) {
        if (!log.success) {
          // Skip queries that originally failed
          failureCount++
          continue
        }
        try {
          // eslint-disable-next-line no-console
          console.log('Replaying query:', log.query)
          await queryDuckDB({ data: log.query })
          successCount++
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to replay query #${log.sequenceNumber}:`, error)
          failureCount++
        }
      }

      if (failureCount > 0) {
        // eslint-disable-next-line no-console
        console.warn(`Rollback completed with ${failureCount} failed queries`)
      }

      // Refresh the page data
      if (onRollbackComplete) {
        onRollbackComplete()
      } else {
        // Reload the page to refresh data
        window.location.reload()
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Rollback failed:', error)
      alert(
        `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsRollingBack(null)
      setRollbackSequenceNumber(null)
    }
  }

  return (
    <Box
      p="md"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Group mb="md" justify="space-between" align="center">
        <Group gap="xs">
          <IconHistory size={18} />
          <Text fw={600} size="sm">
            Query History
          </Text>
        </Group>
        <Badge size="sm" variant="light">
          {queryLogs.length} queries
        </Badge>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="xs">
          {queryLogs.map((log, index) => {
            const isLast = index === queryLogs.length - 1
            const isRollingBackToThis = isRollingBack === log.sequenceNumber

            return (
              <Paper
                key={log._id}
                p="sm"
                withBorder
                style={{
                  position: 'relative',
                  opacity: isRollingBackToThis ? 0.6 : 1,
                }}
              >
                <Group justify="space-between" align="flex-start" gap="xs">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" mb="xs" wrap="nowrap">
                      {log.success ? (
                        <IconCheck size={16} color="green" />
                      ) : (
                        <IconX size={16} color="red" />
                      )}
                      <Text size="xs" c="dimmed" fw={500}>
                        #{log.sequenceNumber}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatTimeAgo(log.executedAt)}
                      </Text>
                      {log.resultMetadata?.executionTimeMs && (
                        <Badge size="xs" variant="light" color="gray">
                          {log.resultMetadata.executionTimeMs}ms
                        </Badge>
                      )}
                    </Group>

                    <Code
                      block
                      style={{
                        fontSize: '11px',
                        maxHeight: '60px',
                        overflow: 'auto',
                        wordBreak: 'break-all',
                      }}
                    >
                      {log.query.length > 200
                        ? `${log.query.substring(0, 200)}...`
                        : log.query}
                    </Code>

                    {log.error && (
                      <Text size="xs" c="red" mt="xs">
                        Error: {log.error}
                      </Text>
                    )}

                    {log.resultMetadata && (
                      <Group gap="xs" mt="xs">
                        {log.resultMetadata.rowCount !== undefined && (
                          <Text size="xs" c="dimmed">
                            {log.resultMetadata.rowCount.toLocaleString()} rows
                          </Text>
                        )}
                        {log.resultMetadata.columnCount !== undefined && (
                          <Text size="xs" c="dimmed">
                            {log.resultMetadata.columnCount} columns
                          </Text>
                        )}
                      </Group>
                    )}
                  </Box>

                  {!isLast && (
                    <Tooltip label="Rollback to before this query">
                      <Button
                        size="xs"
                        variant="light"
                        color="orange"
                        onClick={() => handleRollback(log.sequenceNumber)}
                        loading={isRollingBackToThis}
                        disabled={isRollingBack !== null}
                      >
                        Rollback
                      </Button>
                    </Tooltip>
                  )}
                </Group>

                {!isLast && (
                  <Divider
                    mt="sm"
                    style={{
                      borderColor: 'rgba(0, 0, 0, 0.1)',
                      borderStyle: 'dashed',
                    }}
                  />
                )}
              </Paper>
            )
          })}
        </Stack>
      </ScrollArea>
    </Box>
  )
}
