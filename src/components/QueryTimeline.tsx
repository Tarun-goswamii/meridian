// TASK: Use gitgraph
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
  Paper,
  Loader,
  ThemeIcon,
} from '@mantine/core'
import {
  IconCheck,
  IconX,
  IconHistory,
  IconCircleDot,
} from '@tabler/icons-react'
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
  tableName: string
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

function getQuerySummary(query: string): string {
  // Try to extract the first word and the first table name or identifier
  // e.g. "UPDATE users SET ..." => "UPDATE users"
  // e.g. "SELECT * FROM foo WHERE ..." => "SELECT foo"
  const match = query.match(
    /^\s*(\w+)\s+(?:\*|[\w, ]+)?(?:FROM|INTO|TABLE)?\s*([a-zA-Z0-9_]+)/i,
  )
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`
  }
  // fallback to first 30 chars
  return (
    query.slice(0, 30).replace(/\s+/g, ' ') + (query.length > 30 ? '...' : '')
  )
}

export function QueryTimeline({
  tableName,
  onRollbackComplete,
}: QueryTimelineProps) {
  const queryLogs = useQuery(api.queryLog.getQueryLogs, {
    tableName,
    limit: 100,
  })
  const fileInfo = useQuery(api.csv.getFileByTableName, { tableName })

  const [isRollingBack, setIsRollingBack] = useState<number | null>(null)
  const [rollbackSequenceNumber, setRollbackSequenceNumber] = useState<
    number | null
  >(null)

  const logs = useQuery(
    api.queryLog.getQueryLogsUpTo,
    rollbackSequenceNumber !== null
      ? { tableName, sequenceNumber: rollbackSequenceNumber }
      : 'skip',
  )

  useEffect(() => {
    if (
      logs &&
      rollbackSequenceNumber !== null &&
      isRollingBack !== null // prevent double-rollback if already finished
    ) {
      performRollback(logs as LogType[], rollbackSequenceNumber)
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

  const handleRollback = (sequenceNumber: number, logTableName: string) => {
    if (!fileInfo) {
      alert('Original file not found. Cannot rollback.')
      return
    }
    // Validate that the query belongs to the current table
    if (logTableName !== tableName) {
      alert(
        `Cannot rollback: This query belongs to table "${logTableName}", but you are currently viewing table "${tableName}".`,
      )
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
    // Validate that all logs belong to the current table
    const invalidLogs = logs.filter((log) => log.tableName !== tableName)
    if (invalidLogs.length > 0) {
      alert(
        `Cannot rollback: Some queries belong to different tables. This should not happen.`,
      )
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
        `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    } finally {
      setIsRollingBack(null)
      setRollbackSequenceNumber(null)
    }
  }

  // Timeline line and dot component
  function TimelineLine({
    isFirst,
    isLast,
    color,
    lineHeight = 48,
  }: {
    isFirst: boolean
    isLast: boolean
    color: string
    lineHeight?: number
  }) {
    // The lineHeight prop allows us to control the vertical space between dots.
    // We'll use absolute positioning for the vertical line so it connects all dots.
    return (
      <Box
        style={{
          position: 'relative',
          width: 24,
          minHeight: lineHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {/* Vertical line connecting all dots */}
        {!isFirst && (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 2,
              height: '50%',
              background: '#dee2e6',
              opacity: 0.6,
              transform: 'translateX(-50%)',
              zIndex: 0,
            }}
          />
        )}
        {/* Dot */}
        <Box
          style={{
            position: 'relative',
            zIndex: 2,
            background: '#fff',
            borderRadius: '50%',
            border: `2px solid ${color === 'green' ? '#51cf66' : color === 'red' ? '#fa5252' : '#868e96'}`,
            width: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemeIcon
            radius="xl"
            size={8}
            color={color}
            style={{
              background: '#fff',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            <IconCircleDot size={12} />
          </ThemeIcon>
        </Box>
        {/* Bottom line */}
        {!isLast && (
          <Box
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 2,
              height: '50%',
              background: '#dee2e6',
              opacity: 0.6,
              transform: 'translateX(-50%)',
              zIndex: 0,
            }}
          />
        )}
      </Box>
    )
  }

  return (
    <Box
      p="md"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 12,
      }}
    >
      <Group mb="md" justify="space-between" align="center">
        <Group gap="xs">
          <IconHistory size={20} />
          <Text fw={700} size="md" style={{ letterSpacing: 0.5 }}>
            Query Timeline
          </Text>
        </Group>
        <Badge
          size="sm"
          variant="gradient"
          gradient={{ from: 'indigo', to: 'cyan', deg: 90 }}
        >
          {queryLogs.length} queries
        </Badge>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            position: 'relative',
            marginLeft: 8,
          }}
        >
          {queryLogs.map((log, index) => {
            const isFirst = index === 0
            const isLast = index === queryLogs.length - 1
            const isRollingBackToThis = isRollingBack === log.sequenceNumber
            const color = log.success ? 'green' : 'red'

            return (
              <Group
                key={log._id}
                align="flex-start"
                gap={0}
                style={{
                  position: 'relative',
                  opacity: isRollingBackToThis ? 0.6 : 1,
                  marginBottom: isLast ? 0 : 0,
                }}
              >
                {/* Timeline line and dot */}
                <TimelineLine
                  isFirst={isFirst}
                  isLast={isLast}
                  color={color}
                  lineHeight={72}
                />

                {/* Timeline card */}
                <Paper
                  shadow="xs"
                  radius="md"
                  p="sm"
                  withBorder
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    marginBottom: isLast ? 0 : 8,
                    background: log.success ? '#e6fcf5' : '#fff0f0',
                    borderColor: log.success ? '#51cf66' : '#fa5252',
                    minWidth: 0,
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                    gap="xs"
                    wrap="nowrap"
                  >
                    <Group gap="xs" align="center" wrap="nowrap">
                      {log.success ? (
                        <Tooltip label="Success" withArrow>
                          <ThemeIcon
                            color="green"
                            size="sm"
                            radius="xl"
                            variant="light"
                          >
                            <IconCheck size={14} />
                          </ThemeIcon>
                        </Tooltip>
                      ) : (
                        <Tooltip label="Failed" withArrow>
                          <ThemeIcon
                            color="red"
                            size="sm"
                            radius="xl"
                            variant="light"
                          >
                            <IconX size={14} />
                          </ThemeIcon>
                        </Tooltip>
                      )}
                      <Text
                        size="xs"
                        fw={600}
                        c="dimmed"
                        style={{ fontFamily: 'monospace' }}
                      >
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
                    {!isLast && log.tableName === tableName && (
                      <Tooltip label="Rollback to after this query" withArrow>
                        <Button
                          size="xs"
                          onClick={() =>
                            handleRollback(log.sequenceNumber, log.tableName)
                          }
                          loading={isRollingBackToThis}
                          disabled={isRollingBack !== null}
                          style={{ fontWeight: 600 }}
                        >
                          Rollback
                        </Button>
                      </Tooltip>
                    )}
                    {!isLast && log.tableName !== tableName && (
                      <Tooltip
                        label={`This query belongs to table "${log.tableName}"`}
                        withArrow
                      >
                        <Button
                          size="xs"
                          disabled
                          variant="subtle"
                          style={{ fontWeight: 600 }}
                        >
                          Different Table
                        </Button>
                      </Tooltip>
                    )}
                  </Group>

                  <Group gap="xs" mt={4} align="center">
                    {/* Show the full query in a gray, scrollable, 2-line-tall box */}
                    <Box
                      style={{
                        background: '#f1f3f5',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: '#495057',
                        maxHeight: 40, // ~2 lines
                        overflowX: 'auto',
                        overflowY: 'auto',
                        whiteSpace: 'pre',
                        lineHeight: 1.3,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      {log.query}
                    </Box>
                    {log.resultMetadata && (
                      <>
                        {log.resultMetadata.rowCount !== undefined && (
                          <Badge size="xs" color="teal" variant="light">
                            {log.resultMetadata.rowCount.toLocaleString()} rows
                          </Badge>
                        )}
                        {log.resultMetadata.columnCount !== undefined && (
                          <Badge size="xs" color="blue" variant="light">
                            {log.resultMetadata.columnCount} cols
                          </Badge>
                        )}
                      </>
                    )}
                  </Group>
                  {log.error && (
                    <Text
                      size="xs"
                      c="red"
                      mt={4}
                      style={{ fontFamily: 'monospace' }}
                    >
                      Error: {log.error}
                    </Text>
                  )}
                </Paper>
              </Group>
            )
          })}
        </Box>
      </ScrollArea>
    </Box>
  )
}
