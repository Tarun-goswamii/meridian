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
import { Text, Group, Box, Divider } from '@mantine/core'
import { QueryEditor } from '~/components/QueryEditor'
import type { Insight } from '~/components/InsightsPanel'
import { useDidUpdate } from '@mantine/hooks'
import usePresence from '@convex-dev/presence/react'
import FacePile from '@convex-dev/presence/facepile'
import { analyzeTableWithDuckDB } from '~/utils/duckdbAnalytics'
import { PaginationControls } from '~/components/PaginationControls'
import { TableHeader } from '~/components/TableHeader'
import { DataTable } from '~/components/DataTable'
import { TableSidebar } from '~/components/TableSidebar'
import { useTableColumns } from '~/components/useTableColumns'
import { StatisticalFindingsPanel } from '~/components/StatisticalFindingsPanel'

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

  // Panel toggle state
  const [activePanel, setActivePanel] = useState<
    'agent' | 'insights' | 'history'
  >('agent')

  const [name] = useState(() => 'User ' + Math.floor(Math.random() * 10000))
  const presenceState = usePresence(api.presence, 'my-chat-room', name)

  const askGemini = useAction(api.table_agent.askGemini)
  const generateInsights = useAction(api.insights.generateInsights)
  const logQuery = useMutation(api.queryLog.logQuery)
  const threads = useQuery(api.table_agent.listAgentThreads, {
    tableName: table,
  })
  const hasInitialisedThreadSelection = useRef(false)
  const threadMessages = useQuery(
    api.table_agent.getAgentThreadMessages,
    selectedThreadId
      ? { agentThreadId: selectedThreadId }
      : ('skip' as any),
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
        success: true,
        resultMetadata,
      })

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
            <FacePile presenceState={presenceState ?? []} />
            <TableHeader
              tableName={table}
              columnCount={data.columns.length}
              rowCount={data.rows.length}
              columns={columns}
              columnVisibility={columnVisibility}
              onVisibilityChange={setColumnVisibility}
            />
            <Divider mb="xl" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }} />
            <DataTable
              table={reactTable}
              visibleColumnsCount={visibleColumns.length}
            />
            <StatisticalFindingsPanel findings={statisticalFindings} />
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
              <PaginationControls
                totalRows={data.rows.length}
                pageSize={pageSize}
                pageIndex={pageIndex}
                onPageSizeChange={setPageSize}
                onPageIndexChange={setPageIndex}
              />
            </Group>
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
