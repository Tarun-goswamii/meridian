import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { queryDuckDB } from '~/utils/duckdb'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  Title,
  Table,
  ScrollArea,
  Text,
  Group,
  Badge,
  Box,
  Divider,
  Tooltip,
  ActionIcon,
  Menu,
  Checkbox,
  Button,
  SegmentedControl,
} from '@mantine/core'
import { QueryEditor } from '~/components/QueryEditor'
import { AgentEditor } from '~/components/AgentEditor'
import { InsightsPanel, type Insight } from '~/components/InsightsPanel'
import { IconColumns, IconBrain, IconSparkles } from '@tabler/icons-react'
import { useDidUpdate } from '@mantine/hooks'
import usePresence from '@convex-dev/presence/react'
import FacePile from '@convex-dev/presence/facepile'
import { analyzeTableWithDuckDB } from '~/utils/duckdbAnalytics'

type TableData = {
  columns: { name: string; type: string }[]
  rows: Record<string, any>[]
}

const tableQueryOptions = (table: string) =>
  queryOptions({
    queryKey: ['tables', table],
    queryFn: async () => {
      const result = await queryDuckDB({ data: 'SELECT * FROM ' + table })
      return JSON.parse(result) as TableData
    },
  })

export const Route = createFileRoute('/_authed/table/$table')({
  component: RouteComponent,
  loader: ({ params: { table }, context }) => {
    context.queryClient.ensureQueryData(tableQueryOptions(table))
  },
})

function RouteComponent() {
  const { table } = Route.useParams()
  const queryClient = useQueryClient()
  const tableQuery = useSuspenseQuery(tableQueryOptions(table))
  const data = tableQuery.data

  const [query, setQuery] = useState(`SELECT * FROM ${table}`)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [agentInput, setAgentInput] = useState('')
  const [isAgentExecuting, setIsAgentExecuting] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [agentDescription, setAgentDescription] = useState<string | undefined>(
    undefined,
  )
  const [threadId, setThreadId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; commands?: string[] }>
  >([])

  // Command queue state
  const [commandQueue, setCommandQueue] = useState<string[]>([])
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0)

  // Column visibility state for hiding/showing columns
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({})

  // Pagination state for large number of rows
  const [pageSize, setPageSize] = useState(50)
  const [pageIndex, setPageIndex] = useState(0)

  // Insights state
  const [insights, setInsights] = useState<Insight[]>([])
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)

  // Panel toggle state
  const [activePanel, setActivePanel] = useState<'agent' | 'insights'>('agent')

  const [name] = useState(() => 'User ' + Math.floor(Math.random() * 10000))
  const presenceState = usePresence(api.presence, 'my-chat-room', name)

  const askGemini = useAction(api.table_agent.askGemini)
  const generateInsights = useAction(api.insights.generateInsights)

  const handleExecuteQuery = async () => {
    setIsExecuting(true)
    setError(null)
    // Clear old insights when starting a new query
    setInsights([])
    setInsightsError(null)

    try {
      await queryDuckDB({ data: query })
      await queryClient.invalidateQueries({ queryKey: ['tables', table] })
      setPageIndex(0) // Reset page on query change

      // Advance to next command in queue if available
      if (
        commandQueue.length > 0 &&
        currentCommandIndex < commandQueue.length - 1
      ) {
        const nextIndex = currentCommandIndex + 1
        setCurrentCommandIndex(nextIndex)
        setQuery(commandQueue[nextIndex])
      } else if (
        commandQueue.length > 0 &&
        currentCommandIndex >= commandQueue.length - 1
      ) {
        // All commands executed, clear queue
        setCommandQueue([])
        setCurrentCommandIndex(0)
      }
      // Note: Insights are now generated manually by user clicking a button
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }

  const generateInsightsForData = async (
    dataToAnalyze: TableData,
    forceRefresh: boolean = false,
  ) => {
    setIsGeneratingInsights(true)
    setInsightsError(null)
    try {
      // Use DuckDB to analyze the data
      const statisticalAnalyses = await analyzeTableWithDuckDB(
        table,
        query,
        dataToAnalyze.columns,
      )

      // Pass the DuckDB analysis results to Convex for AI processing
      const result = await generateInsights({
        tableName: table,
        query: query,
        statisticalAnalyses: statisticalAnalyses,
        rowCount: dataToAnalyze.rows.length,
        columnCount: dataToAnalyze.columns.length,
        forceRefresh: forceRefresh,
      })

      if (result.error) {
        setInsightsError(result.error)
      } else {
        setInsights(result.insights || [])
      }
    } catch (err) {
      setInsightsError(
        err instanceof Error ? err.message : 'Failed to generate insights',
      )
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  const handleGenerateInsights = async () => {
    if (data && data.rows.length > 0) {
      await generateInsightsForData(data, false)
    }
  }

  const handleRefreshInsights = async () => {
    if (data && data.rows.length > 0) {
      await generateInsightsForData(data, true) // Force refresh
    }
  }

  const handleDismissInsights = () => {
    setInsights([])
    setInsightsError(null)
  }

  const handleAgentAction = async () => {
    if (!agentInput.trim()) return

    setIsAgentExecuting(true)
    setAgentError(null)
    try {
      const sampleRows = data.rows.slice(0, 3)

      const response = await askGemini({
        prompt: agentInput,
        tableName: table,
        columns: data.columns,
        sampleRows: sampleRows,
        threadId: threadId,
      })

      // Set up command queue
      if (response.commands && response.commands.length > 0) {
        setCommandQueue(response.commands)
        setCurrentCommandIndex(0)
        setQuery(response.commands[0])
      }

      setAgentDescription(response.description)
      setThreadId(response.threadId)

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: agentInput },
        {
          role: 'assistant',
          content: response.description,
          commands: response.commands || [],
        },
      ])

      setAgentInput('')
    } catch (err) {
      setAgentError(
        err instanceof Error ? err.message : 'Failed to get agent response',
      )
    } finally {
      setIsAgentExecuting(false)
    }
  }

  // Table columns with type tooltip and column show/hide support
  const columns = useMemo<ColumnDef<Record<string, any>>[]>(
    () =>
      data.columns.map((col) => ({
        accessorKey: col.name,
        header: () => (
          <Group
            gap={4}
            align="center"
            style={{ minWidth: 100, maxWidth: 320, overflow: 'hidden' }}
          >
            <Tooltip
              label={col.type}
              withArrow
              position="top"
              openDelay={300}
              multiline
              maw={260}
            >
              <Text
                fw={600}
                size="xs"
                c="gray.9"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {col.name}
              </Text>
            </Tooltip>
            <Badge
              size="xs"
              variant="dot"
              color="gray"
              style={{
                fontWeight: 500,
                textTransform: 'lowercase',
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                fontSize: '10px',
                padding: '2px 6px',
              }}
            >
              {col.type}
            </Badge>
          </Group>
        ),
        cell: (info) => {
          const value = info.getValue()
          if (value === null || value === undefined) {
            return (
              <Text
                c="gray.5"
                fs="italic"
                size="xs"
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                }}
              >
                NULL
              </Text>
            )
          }
          const stringValue = String(value)
          const isNumeric =
            !isNaN(Number(value)) &&
            value !== '' &&
            !isNaN(parseFloat(stringValue))
          return (
            <Text
              size="xs"
              c={isNumeric ? 'gray.8' : 'gray.9'}
              style={{
                fontFamily: isNumeric
                  ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
                  : 'system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 260,
                lineHeight: 1.5,
              }}
              title={stringValue.length > 60 ? stringValue : undefined}
            >
              {stringValue.length > 60
                ? stringValue.slice(0, 60) + '…'
                : stringValue}
            </Text>
          )
        },
        enableHiding: true,
      })),
    [data.columns],
  )

  // Handle default column visibility on mount
  useDidUpdate(() => {
    // Show all columns if not yet set, or keep what's already set
    if (Object.keys(columnVisibility).length === 0 && data.columns.length > 0) {
      // If too many columns, hide some by default
      if (data.columns.length > 15) {
        const visible: Record<string, boolean> = {}
        data.columns.forEach((col, idx) => {
          visible[col.name] = idx < 12 // Show first 12, hide the rest
        })
        setColumnVisibility(visible)
      } else {
        setColumnVisibility(
          Object.fromEntries(data.columns.map((col) => [col.name, true])),
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.columns])

  // Filter visible columns based on columnVisibility
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      if ('accessorKey' in col && typeof col.accessorKey === 'string') {
        return columnVisibility[col.accessorKey] !== false
      }
      return true
    })
  }, [columns, columnVisibility])

  // Pagination logic for large number of rows
  const paginatedRows = useMemo(() => {
    if (!data.rows) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return data.rows.slice(start, end)
  }, [data.rows, pageIndex, pageSize])

  const reactTable = useReactTable({
    data: paginatedRows,
    columns: visibleColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(data.rows.length / pageSize),
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  })

  // Utility for pagination button rendering
  function PaginationControls() {
    const totalPages = Math.ceil(data.rows.length / pageSize)
    const prevDisabled = pageIndex === 0
    const nextDisabled = pageIndex >= totalPages - 1

    // Only render if more than one page
    if (totalPages <= 1) return null

    return (
      <Group gap={8} align="center">
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setPageIndex(0)}
          disabled={prevDisabled}
        >
          First
        </Button>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          disabled={prevDisabled}
        >
          Prev
        </Button>
        <Text size="xs" c="gray.7">
          Page{' '}
          <strong>
            {pageIndex + 1} / {totalPages}
          </strong>
        </Text>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
          disabled={nextDisabled}
        >
          Next
        </Button>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setPageIndex(totalPages - 1)}
          disabled={nextDisabled}
        >
          Last
        </Button>
        <Text size="xs" ml={24} c="gray.6">
          Rows per page:
        </Text>
        <select
          style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPageIndex(0)
          }}
        >
          {[25, 50, 100, 250, 500, 1000].map((sz) => (
            <option key={sz} value={sz}>
              {sz}
            </option>
          ))}
        </select>
      </Group>
    )
  }

  // Utility for choosing visible columns with a menu
  function ColumnsMenu() {
    if (columns.length <= 10) return null
    return (
      <Menu
        shadow="md"
        width={260}
        withinPortal
        withArrow
        position="bottom-end"
        offset={2}
      >
        <Menu.Target>
          <ActionIcon
            variant="light"
            color="gray"
            size="md"
            style={{ marginLeft: 8 }}
            aria-label="Show/hide columns"
          >
            <IconColumns size={20} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown style={{ maxHeight: 350, overflowY: 'auto' }}>
          <Menu.Label>Show/Hide Columns</Menu.Label>
          {columns.map((col) =>
            'accessorKey' in col && typeof col.accessorKey === 'string' ? (
              <Menu.Item
                key={col.accessorKey}
                style={{
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 2,
                  paddingBottom: 2,
                }}
              >
                <Checkbox
                  label={String(col.accessorKey)}
                  size="xs"
                  checked={columnVisibility[col.accessorKey] !== false}
                  onChange={() => {
                    setColumnVisibility((v) => ({
                      ...v,
                      [col.accessorKey]: !(v[col.accessorKey] !== false), // toggle boolean
                    }))
                  }}
                />
              </Menu.Item>
            ) : null,
          )}
          <Menu.Divider />
          <Menu.Item
            color="gray"
            onClick={() =>
              setColumnVisibility(
                Object.fromEntries(
                  columns.map((col) => [
                    'accessorKey' in col && typeof col.accessorKey === 'string'
                      ? col.accessorKey
                      : '',
                    true,
                  ]),
                ),
              )
            }
          >
            Show all
          </Menu.Item>
          <Menu.Item
            color="gray"
            onClick={() =>
              setColumnVisibility(
                Object.fromEntries(
                  columns.map((col) => [
                    'accessorKey' in col && typeof col.accessorKey === 'string'
                      ? col.accessorKey
                      : '',
                    false,
                  ]),
                ),
              )
            }
          >
            Hide all
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    )
  }

  return (
    <>
      <Box
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          // background: '#f8f9fa',
        }}
      >
        {/* Main Content Area */}
        <Box
          style={{
            flex: 1,
            padding: '24px',
            paddingRight: '420px', // Space for sidebar
            paddingBottom: '180px', // Space for bottom query editor
            transition: 'padding 0.2s ease',
          }}
        >
          <Box
            p="xl"
            style={{
              height: '100%',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="xs">
                <Title
                  order={2}
                  fw={600}
                  c="gray.9"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    maxWidth: 350,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                  title={table}
                >
                  {table}
                </Title>
                <Badge
                  size="sm"
                  variant="dot"
                  color="gray"
                  style={{
                    fontWeight: 500,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                  }}
                >
                  {data.columns.length} column
                  {data.columns.length === 1 ? '' : 's'}
                </Badge>
                <ColumnsMenu />
              </Group>
              <Badge
                size="md"
                variant="filled"
                color="blue"
                style={{
                  fontWeight: 600,
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                }}
              >
                {data.rows.length.toLocaleString()} row
                {data.rows.length === 1 ? '' : 's'}
              </Badge>
            </Group>
            <Divider mb="xl" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />
            <ScrollArea
              type="auto"
              offsetScrollbars
              style={{
                maxHeight: 'calc(100vh - 265px)',
                minHeight: 300,
                borderRadius: 4,
                background: 'white',
                overflow: 'auto',
              }}
              scrollbarSize={10}
              scrollHideDelay={300}
              h="100%"
              w="100%"
            >
              <ScrollArea
                type="auto"
                offsetScrollbars
                scrollHideDelay={300}
                style={{
                  minWidth: Math.max(960, visibleColumns.length * 160),
                  width: '100%',
                  overflowX: 'auto',
                }}
                scrollbarSize={8}
                h="100%"
              >
                <Table
                  striped
                  highlightOnHover
                  withColumnBorders
                  verticalSpacing="sm"
                  horizontalSpacing="sm"
                  style={{
                    borderCollapse: 'separate',
                    tableLayout: 'auto',
                    minWidth:
                      visibleColumns.length < 8
                        ? undefined
                        : visibleColumns.length * 140,
                    maxWidth: 2600,
                  }}
                  styles={{
                    thead: {
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                      zIndex: 2,
                      top: 0,
                      position: 'sticky',
                    },
                    th: {
                      padding: '8px 10px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                      backgroundColor: 'rgba(250,250,250,0.95)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      fontSize: 12,
                      maxWidth: 300,
                    },
                    td: {
                      padding: '7px 10px',
                      borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                      fontSize: 12,
                      maxWidth: 300,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                    tr: {
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.01)',
                      },
                    },
                  }}
                >
                  <thead>
                    {reactTable.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {reactTable.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumns.length}>
                          <Text c="dimmed" ta="center" py="md">
                            No data available
                          </Text>
                        </td>
                      </tr>
                    ) : (
                      reactTable.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </ScrollArea>
            </ScrollArea>
            <Group
              justify="space-between"
              align="center"
              mt="lg"
              pt="md"
              style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}
              wrap="nowrap"
            >
              <Group>
                <Text
                  size="xs"
                  c="gray.6"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  Displaying {paginatedRows.length.toLocaleString()} of{' '}
                  {data.rows.length.toLocaleString()} row
                  {data.rows.length === 1 ? '' : 's'}
                </Text>
                <Text
                  size="xs"
                  c="gray.5"
                  style={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                  }}
                >
                  {visibleColumns.length} × {data.rows.length}
                </Text>
              </Group>
              <PaginationControls />
            </Group>
          </Box>
        </Box>

        {/* Right Sidebar - Toggle between Agent and Insights */}
        <Box
          style={{
            position: 'fixed',
            right: 15,
            top: 10, // Navbar height (approximate)
            bottom: 0,
            width: 400,
            zIndex: 200,
            padding: '16px',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 60px)',
            gap: '12px',
          }}
        >
          {/* Toggle Header */}
          <Box
            p="xs"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 'var(--mantine-radius-md)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
          >
            <SegmentedControl
              value={activePanel}
              onChange={(value) =>
                setActivePanel(value as 'agent' | 'insights')
              }
              data={[
                {
                  value: 'agent',
                  label: (
                    <Group gap={6} style={{ justifyContent: 'center' }}>
                      <IconSparkles size={16} />
                      <Text size="xs" fw={500}>
                        Agent
                      </Text>
                    </Group>
                  ),
                },
                {
                  value: 'insights',
                  label: (
                    <Group gap={6} style={{ justifyContent: 'center' }}>
                      <IconBrain size={16} />
                      <Text size="xs" fw={500}>
                        Insights
                      </Text>
                      {insights.length > 0 && (
                        <Badge
                          size="xs"
                          variant="filled"
                          color="violet"
                          style={{ minWidth: 18, height: 18, padding: '0 4px' }}
                        >
                          {insights.length}
                        </Badge>
                      )}
                    </Group>
                  ),
                },
              ]}
              fullWidth
              size="sm"
            />
          </Box>

          {/* Active Panel Content */}
          <Box style={{ flex: 1, minHeight: 0 }}>
            {activePanel === 'agent' ? (
              <AgentEditor
                input={agentInput}
                onInputChange={setAgentInput}
                onExecute={handleAgentAction}
                error={agentError}
                onErrorClose={() => setAgentError(null)}
                isExecuting={isAgentExecuting}
                description={agentDescription}
                messages={messages}
                commandQueue={commandQueue}
                currentCommandIndex={currentCommandIndex}
              />
            ) : (
              <InsightsPanel
                insights={insights}
                isLoading={isGeneratingInsights}
                onGenerate={handleGenerateInsights}
                onRefresh={handleRefreshInsights}
                onDismiss={handleDismissInsights}
                error={insightsError}
                hasData={data && data.rows.length > 0}
              />
            )}
          </Box>
        </Box>

        {/* Query Editor - Fixed at Bottom */}
        <Box
          style={{
            position: 'fixed',
            left: 0,
            right: 400, // Space for sidebar
            bottom: 0,
            zIndex: 150,
            padding: '16px 24px',
            backgroundColor: 'transparent',
          }}
        >
          <FacePile presenceState={presenceState ?? []} />

          <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
            <QueryEditor
              query={query}
              onQueryChange={setQuery}
              onExecute={handleExecuteQuery}
              error={error}
              onErrorClose={() => setError(null)}
              isExecuting={isExecuting}
              commandQueue={commandQueue}
              currentCommandIndex={currentCommandIndex}
            />
          </Box>
        </Box>
      </Box>
    </>
  )
}
