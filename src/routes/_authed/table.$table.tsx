import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { queryDuckDB } from '~/utils/duckdb'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Text, Group, Box, Divider, Tabs, ScrollArea } from '@mantine/core'
import { QueryEditor } from '~/components/QueryEditor'
import type { Insight } from '~/components/InsightsPanel'
import { useDidUpdate } from '@mantine/hooks'
import { analyzeTableWithDuckDB } from '~/utils/duckdbAnalytics'
import { PaginationControls } from '~/components/PaginationControls'
import { TableHeader } from '~/components/TableHeader'
import { DataTable } from '~/components/DataTable'
import { TableSidebar } from '~/components/TableSidebar'
import { useTableColumns } from '~/components/useTableColumns'
import { StatisticalFindingsPanel } from '~/components/StatisticalFindingsPanel'
import {
  ChartCanvas,
  type ChartItem,
  type ChartConfig,
} from '~/components/ChartCanvas'
import { convexQuery } from '@convex-dev/react-query'
import { TableNotifications } from '~/components/TableNotifications'

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
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>(
    undefined,
  )
  const [agentMode, setAgentMode] = useState<'query' | 'analysis'>('query')

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
  const [statisticalFindings, setStatisticalFindings] = useState<any[]>([])

  // Charts state
  const [charts, setCharts] = useState<ChartItem[]>([])

  // Panel toggle state
  const [activePanel, setActivePanel] = useState<
    'agent' | 'insights' | 'history'
  >('agent')

  // Tab state for main content area
  const [activeTab, setActiveTab] = useState<'table' | 'statistics' | 'charts'>(
    'table',
  )
  const user = useSuspenseQuery(convexQuery(api.authFns.currentUser, {}))

  const askGemini = useAction(api.table_agent.askGemini)
  const generateInsights = useAction(api.insights.generateInsights)
  const logQuery = useMutation(api.queryLog.logQuery)
  const broadcastNotification = useMutation(
    api.notifications.broadcastNotification,
  )
  const threads = useQuery(api.agent_utils.listAgentThreads, {
    tableName: table,
  })
  const hasInitialisedThreadSelection = useRef(false)
  const threadMessages = useQuery(
    api.agent_utils.getAgentThreadMessages,
    selectedThreadId ? { agentThreadId: selectedThreadId } : ('skip' as any),
  )
  const agentMessages = threadMessages?.messages ?? []
  const threadsList = threads ?? []
  const selectedThread = selectedThreadId
    ? threadsList.find((thread) => thread.agentThreadId === selectedThreadId)
    : undefined
  const previousSelectedThreadId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (hasInitialisedThreadSelection.current) return
    if (threads && threads.length > 0) {
      setSelectedThreadId((prev) => prev ?? threads[0].agentThreadId)
      hasInitialisedThreadSelection.current = true
    }
  }, [threads])

  useEffect(() => {
    if (selectedThreadId === undefined) {
      previousSelectedThreadId.current = undefined
      return
    }
    if (selectedThreadId === previousSelectedThreadId.current) {
      return
    }
    previousSelectedThreadId.current = selectedThreadId
    if (selectedThread?.lastMode && selectedThread.lastMode !== agentMode) {
      setAgentMode(selectedThread.lastMode)
    }
    if (selectedThread?.lastMessageSummary) {
      setAgentDescription(selectedThread.lastMessageSummary)
    }
  }, [selectedThreadId, selectedThread, agentMode])

  useEffect(() => {
    if (!selectedThreadId) {
      return
    }
    if (!threadMessages) {
      return
    }
    const assistantMessages =
      threadMessages.messages?.filter((msg) => msg.role === 'assistant') ?? []
    if (assistantMessages.length === 0) {
      setAgentDescription(undefined)
      return
    }
    const latest = assistantMessages[assistantMessages.length - 1]
    const latestDescription =
      (latest.description && latest.description.trim().length > 0
        ? latest.description
        : latest.content) || undefined
    if (latestDescription) {
      setAgentDescription(latestDescription)
    }
  }, [selectedThreadId, threadMessages])

  // Track previous chart IDs to prevent infinite loops
  const previousChartIdsRef = useRef<string>('')

  // Extract charts from tool steps in messages using useMemo to prevent infinite loops
  const extractedCharts = useMemo(() => {
    const charts: ChartItem[] = []
    let chartIndex = 0

    agentMessages.forEach((message) => {
      if (message.role === 'assistant' && message.toolSteps) {
        message.toolSteps.forEach((step, stepIndex) => {
          if (
            step.tool === 'createChart' &&
            step.finished &&
            step.result?.success &&
            step.result?.chart
          ) {
            const chartConfig: ChartConfig = step.result.chart
            // Generate unique ID based on message and step
            const chartId = `chart-${message.createdAt || Date.now()}-${stepIndex}`

            // Check if chart already exists
            if (!charts.find((c) => c.id === chartId)) {
              // Better initial positioning: 2 columns, with proper spacing
              const CHART_WIDTH = 480
              const CHART_HEIGHT = 370
              const GAP = 20
              const PADDING = 20

              const col = chartIndex % 2
              const row = Math.floor(chartIndex / 2)

              charts.push({
                id: chartId,
                config: chartConfig,
                position: {
                  x: col * (CHART_WIDTH + GAP) + PADDING,
                  y: row * (CHART_HEIGHT + GAP) + PADDING,
                },
              })
              chartIndex++
            }
          }
        })
      }
    })

    return charts
  }, [agentMessages])

  // Track previous data version to detect changes
  const previousDataVersionRef = useRef<string>('')
  // Track charts in a ref to avoid dependency issues
  const chartsRef = useRef<ChartItem[]>([])

  // Update charts ref when charts state changes
  useEffect(() => {
    chartsRef.current = charts
  }, [charts])

  // Update charts state only when extracted charts change
  useEffect(() => {
    const newChartIds = extractedCharts
      .map((c) => c.id)
      .sort()
      .join(',')

    // Only update if the chart IDs have actually changed
    if (previousChartIdsRef.current !== newChartIds) {
      const previousIds = previousChartIdsRef.current.split(',').filter(Boolean)

      // Detect newly created charts
      const newCharts = extractedCharts.filter(
        (chart) => !previousIds.includes(chart.id),
      )

      previousChartIdsRef.current = newChartIds

      // Preserve positions of existing charts
      setCharts((prevCharts) => {
        const existingChartsMap = new Map(prevCharts.map((c) => [c.id, c]))
        const updatedCharts = extractedCharts.map((chart) => {
          const existing = existingChartsMap.get(chart.id)
          return existing ? existing : chart
        })
        chartsRef.current = updatedCharts
        return updatedCharts
      })

      // Broadcast notification for new charts
      if (newCharts.length > 0) {
        broadcastNotification({
          tableName: table,
          type: 'chart_created',
          message: `created ${newCharts.length} chart${newCharts.length > 1 ? 's' : ''}`,
          metadata: { chartCount: newCharts.length },
        }).catch((err) => {
          console.error('Failed to broadcast notification:', err)
        })
      }
    }
  }, [extractedCharts, table, broadcastNotification])

  // Re-execute chart queries when table data changes
  useEffect(() => {
    // Create a version string from current data to detect changes
    const currentDataVersion = JSON.stringify({
      rowCount: data.rows.length,
      columnCount: data.columns.length,
      // Include a hash of first few rows to detect data changes
      sampleHash: JSON.stringify(data.rows.slice(0, 3)),
    })

    // Only update charts if data has actually changed
    if (previousDataVersionRef.current === currentDataVersion) {
      return
    }

    previousDataVersionRef.current = currentDataVersion

    // Re-execute queries for all charts that have queries
    const updateCharts = async () => {
      // Use ref to get current charts without causing dependency issues
      const currentCharts = chartsRef.current
      const chartsWithQueries = currentCharts.filter(
        (chart) => chart.config.query,
      )

      if (chartsWithQueries.length === 0) {
        return
      }

      // Re-execute all chart queries in parallel
      const updatedCharts = await Promise.all(
        chartsWithQueries.map(async (chart) => {
          try {
            if (!chart.config.query) {
              return chart
            }

            // Re-execute the chart's query
            const result = await queryDuckDB({ data: chart.config.query })
            const parsed = JSON.parse(result) as TableData

            if (!parsed.rows || parsed.rows.length === 0) {
              return chart // Keep existing chart if query returns no data
            }

            // Re-analyze data structure (similar to createChart tool logic)
            const columns = parsed.columns || []
            const rows = parsed.rows || []

            const numericColumns = columns.filter((col) => {
              if (!col.type) return false
              const type = col.type.toLowerCase()
              return (
                type.includes('int') ||
                type.includes('float') ||
                type.includes('double') ||
                type.includes('decimal') ||
                type.includes('numeric') ||
                type.includes('real')
              )
            })

            const stringColumns = columns.filter((col) => {
              if (!col.type) return false
              const type = col.type.toLowerCase()
              return (
                type.includes('varchar') ||
                type.includes('text') ||
                type.includes('string') ||
                type.includes('char')
              )
            })

            // Determine axis keys (preserve original if possible)
            let xAxisKey = chart.config.xAxisKey
            let yAxisKey = chart.config.yAxisKey

            // Verify axis keys still exist, otherwise recalculate
            const xColExists = columns.some((col) => col.name === xAxisKey)
            const yColExists = columns.some((col) => col.name === yAxisKey)

            if (!xColExists && stringColumns.length > 0) {
              xAxisKey = stringColumns[0].name
            } else if (!xColExists && numericColumns.length > 0) {
              xAxisKey = numericColumns[0].name
            }

            if (!yColExists && numericColumns.length > 0) {
              const yCol =
                numericColumns.find((col) => col.name !== xAxisKey) ||
                numericColumns[0]
              yAxisKey = yCol.name
            }

            // Prepare updated data
            const chartData = rows.map((row: any) => {
              const entry: any = {}
              columns.forEach((col) => {
                entry[col.name] = row[col.name]
              })
              return entry
            })

            // Update series configuration
            const series: Array<{ name: string; color: string }> = []
            if (
              chart.config.type === 'line' ||
              chart.config.type === 'area' ||
              chart.config.type === 'bar'
            ) {
              numericColumns.forEach((col, idx) => {
                if (col.name !== xAxisKey) {
                  const colors = [
                    'blue',
                    'green',
                    'red',
                    'yellow',
                    'purple',
                    'orange',
                    'cyan',
                    'pink',
                  ]
                  series.push({
                    name: col.name,
                    color: colors[idx % colors.length],
                  })
                }
              })
            }

            // Return updated chart with new data
            return {
              ...chart,
              config: {
                ...chart.config,
                data: chartData,
                dataKey: xAxisKey,
                xAxisKey: xAxisKey,
                yAxisKey: yAxisKey,
                series: series.length > 0 ? series : chart.config.series,
                columns: columns.map((col) => ({
                  name: col.name,
                  type: col.type,
                })),
              },
            }
          } catch (error) {
            console.error(`Error updating chart ${chart.id}:`, error)
            return chart // Return original chart on error
          }
        }),
      )

      // Update charts state with refreshed data
      setCharts((prevCharts) => {
        const updatedMap = new Map(updatedCharts.map((c) => [c.id, c]))
        const newCharts = prevCharts.map(
          (chart) => updatedMap.get(chart.id) || chart,
        )
        chartsRef.current = newCharts
        return newCharts
      })
    }

    updateCharts()
  }, [data]) // Only depend on data, not charts

  const handleExecuteQuery = async () => {
    setIsExecuting(true)
    setError(null)
    // Clear old insights when starting a new query
    setInsights([])
    setInsightsError(null)

    const startTime = Date.now()
    try {
      const result = await queryDuckDB({ data: query })
      const executionTime = Date.now() - startTime

      // Parse result to get metadata
      let resultMetadata
      let parsedData: TableData | null = null
      try {
        const parsed = JSON.parse(result) as TableData
        parsedData = parsed
        resultMetadata = {
          rowCount: parsed.rows?.length,
          columnCount: parsed.columns?.length,
          executionTimeMs: executionTime,
        }
      } catch {
        resultMetadata = {
          executionTimeMs: executionTime,
        }
      }

      // Log successful query
      await logQuery({
        query,
        tableName: table,
        success: true,
        resultMetadata,
      })

      // Broadcast notification about query execution
      try {
        const queryPreview =
          query.length > 50 ? query.substring(0, 50) + '...' : query
        await broadcastNotification({
          tableName: table,
          type: 'query',
          message: `executed a query: ${queryPreview}`,
          metadata: { query, resultMetadata },
        })
      } catch (err) {
        // Don't fail if notification fails
        console.error('Failed to broadcast notification:', err)
      }

      await queryClient.invalidateQueries({ queryKey: ['tables', table] })
      setPageIndex(0) // Reset page on query change

      // Generate statistical findings from the executed query result
      if (
        parsedData &&
        parsedData.rows.length > 0 &&
        parsedData.columns.length > 0
      ) {
        try {
          const statisticalAnalyses = await analyzeTableWithDuckDB(
            table,
            query,
            parsedData.columns,
          )
          setStatisticalFindings(statisticalAnalyses)
        } catch (err) {
          console.error('Error generating statistical findings:', err)
          // Don't set error state, just fail silently
        }
      }

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
      const executionTime = Date.now() - startTime
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to execute query'

      // Log failed query
      try {
        await logQuery({
          query,
          tableName: table,
          success: false,
          error: errorMessage,
          resultMetadata: {
            executionTimeMs: executionTime,
          },
        })
      } catch (logError) {
        // Don't fail the UI if logging fails
        console.error('Failed to log query:', logError)
      }

      setError(errorMessage)
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
        setStatisticalFindings(result.statisticalFindings || [])
      } else {
        setInsights(result.insights || [])
        setStatisticalFindings(result.statisticalFindings || [])

        // Broadcast notification about insights generation
        try {
          await broadcastNotification({
            tableName: table,
            type: 'insights_generated',
            message: `generated ${result.insights?.length || 0} insights`,
            metadata: { insightCount: result.insights?.length || 0 },
          })
        } catch (err) {
          // Don't fail if notification fails
          console.error('Failed to broadcast notification:', err)
        }
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

  const handleSelectThread = (nextThreadId?: string) => {
    setSelectedThreadId(nextThreadId)
    setCommandQueue([])
    setCurrentCommandIndex(0)
    if (!nextThreadId) {
      setAgentMode('query')
      setAgentDescription(undefined)
      return
    }
    const matchingThread = threadsList.find(
      (thread) => thread.agentThreadId === nextThreadId,
    )
    if (matchingThread?.lastMode && matchingThread.lastMode !== agentMode) {
      setAgentMode(matchingThread.lastMode)
    }
    if (matchingThread?.lastMessageSummary) {
      setAgentDescription(matchingThread.lastMessageSummary)
    } else {
      setAgentDescription(undefined)
    }
  }

  const handleCreateNewThread = () => {
    setSelectedThreadId(undefined)
    setAgentInput('')
    setAgentDescription(undefined)
    setCommandQueue([])
    setCurrentCommandIndex(0)
    setAgentMode('query')
  }

  const handleAgentAction = async () => {
    if (!agentInput.trim()) return

    setIsAgentExecuting(true)
    setAgentError(null)
    try {
      const sampleRows = data.rows.slice(0, 3)

      // Get the server URL (for tools to call back)
      const serverUrl = window.location.origin

      const response = await askGemini({
        prompt: agentInput,
        tableName: table,
        columns: data.columns,
        sampleRows: sampleRows,
        threadId: selectedThreadId,
        mode: agentMode,
        serverUrl: serverUrl,
      })

      // Set up command queue (only for query mode)
      if (
        response.mode === 'query' &&
        response.commands &&
        response.commands.length > 0
      ) {
        setCommandQueue(response.commands)
        setCurrentCommandIndex(0)
        setQuery(response.commands[0])
      } else {
        // Clear command queue for analysis mode
        setCommandQueue([])
        setCurrentCommandIndex(0)
      }

      setAgentDescription(
        response.mode === 'query'
          ? response.description
          : response.text?.substring(0, 200),
      )
      setSelectedThreadId(response.threadId)

      // Broadcast notification about agent action
      try {
        const inputPreview =
          agentInput.length > 50
            ? agentInput.substring(0, 50) + '...'
            : agentInput
        await broadcastNotification({
          tableName: table,
          type: response.mode === 'query' ? 'agent_query' : 'agent_analysis',
          message:
            response.mode === 'query'
              ? `asked the AI to generate a query: "${inputPreview}"`
              : `asked the AI for analysis: "${inputPreview}"`,
          metadata: { prompt: agentInput, mode: response.mode },
        })
      } catch (err) {
        // Don't fail if notification fails
        console.error('Failed to broadcast notification:', err)
      }

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
  const columns = useTableColumns(data.columns)

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

  // Automatically generate statistical findings when data changes (including on mount)

  const generateStatisticalFindings = async () => {
    if (data && data.rows.length > 0 && data.columns.length > 0) {
      try {
        const statisticalAnalyses = await analyzeTableWithDuckDB(
          table,
          'SELECT * FROM ' + table,
          data.columns,
        )
        setStatisticalFindings(statisticalAnalyses)
      } catch (err) {
        console.error('Error generating statistical findings:', err)
        // Don't set error state, just fail silently for auto-generation
      }
    }
  }

  generateStatisticalFindings()
  // eslint-disable-next-line react-hooks/exhaustive-deps

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

  return (
    <>
      <TableNotifications
        tableName={table}
        currentUserId={user?.data?.userId ?? null}
      />
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
            style={{
              height: '100%',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <TableHeader
              tableName={table}
              columnCount={data.columns.length}
              rowCount={data.rows.length}
              columns={columns}
              columnVisibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
            />
            <div style={{ padding: '5px' }}></div>

            <Tabs
              value={activeTab}
              onChange={(value) =>
                setActiveTab(value as 'table' | 'statistics' | 'charts')
              }
            >
              <Tabs.List>
                <Tabs.Tab value="table">Data Table</Tabs.Tab>
                <Tabs.Tab value="statistics">Statistics</Tabs.Tab>
                <Tabs.Tab value="charts">Charts</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="table" pt="md">
                <DataTable
                  table={reactTable}
                  visibleColumnsCount={visibleColumns.length}
                />
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
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
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
                  <PaginationControls
                    totalRows={data.rows.length}
                    pageSize={pageSize}
                    pageIndex={pageIndex}
                    onPageSizeChange={setPageSize}
                    onPageIndexChange={setPageIndex}
                  />
                </Group>
              </Tabs.Panel>

              <Tabs.Panel value="statistics" pt="md">
                <StatisticalFindingsPanel findings={statisticalFindings} />
              </Tabs.Panel>

              <Tabs.Panel value="charts" pt="md">
                <ScrollArea
                  type="auto"
                  style={{
                    height: 'calc(100vh - 300px)',
                    minHeight: 500,
                  }}
                >
                  <ChartCanvas
                    charts={charts}
                    onRemoveChart={(id) => {
                      setCharts((prev) => prev.filter((c) => c.id !== id))
                    }}
                    onChartMove={(id, position) => {
                      setCharts((prev) =>
                        prev.map((c) => (c.id === id ? { ...c, position } : c)),
                      )
                    }}
                  />
                </ScrollArea>
              </Tabs.Panel>
            </Tabs>
          </Box>
        </Box>

        <TableSidebar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          tableName={table}
          onRollbackComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['tables', table] })
            setPageIndex(0)
          }}
          insights={insights}
          agentInput={agentInput}
          onAgentInputChange={setAgentInput}
          onAgentExecute={handleAgentAction}
          agentError={agentError}
          onAgentErrorClose={() => setAgentError(null)}
          isAgentExecuting={isAgentExecuting}
          agentDescription={agentDescription}
          threads={threadsList}
          selectedThreadId={selectedThreadId}
          onThreadSelect={handleSelectThread}
          onCreateThread={handleCreateNewThread}
          messages={agentMessages}
          commandQueue={commandQueue}
          currentCommandIndex={currentCommandIndex}
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          isGeneratingInsights={isGeneratingInsights}
          onGenerateInsights={handleGenerateInsights}
          onRefreshInsights={handleRefreshInsights}
          onDismissInsights={handleDismissInsights}
          insightsError={insightsError}
          hasData={data && data.rows.length > 0}
        />

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
