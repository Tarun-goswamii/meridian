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
} from '@mantine/core'
import { QueryEditor } from '~/components/QueryEditor'
import { AgentEditor } from '~/components/AgentEditor'
import { Navbar } from '~/components/Navbar'

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
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([])

  const askClaude = useAction(api.table_agent.askClaude)

  const handleExecuteQuery = async () => {
    setIsExecuting(true)
    setError(null)
    try {
      await queryDuckDB({ data: query })
      await queryClient.invalidateQueries({ queryKey: ['tables', table] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleAgentAction = async () => {
    if (!agentInput.trim()) return

    setIsAgentExecuting(true)
    setAgentError(null)
    try {
      const sampleRows = data.rows.slice(0, 3)

      const response = await askClaude({
        prompt: agentInput,
        tableName: table,
        columns: data.columns,
        sampleRows: sampleRows,
        threadId: threadId,
      })

      setQuery(response.command)
      setAgentDescription(response.description)
      setThreadId(response.threadId)

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: agentInput },
        { role: 'assistant', content: response.description },
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

  const columns = useMemo<ColumnDef<Record<string, any>>[]>(
    () =>
      data.columns.map((col) => ({
        accessorKey: col.name,
        header: () => (
          <Group gap={6} align="center">
            <Text
              fw={600}
              size="sm"
              c="gray.9"
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {col.name}
            </Text>
            {/* <Tooltip label={col.type} withArrow position="top">
              <Badge
                size="xs"
                variant="light"
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
            </Tooltip> */}
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
              size="sm"
              c={isNumeric ? 'gray.8' : 'gray.9'}
              style={{
                fontFamily: isNumeric
                  ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
                  : 'system-ui, -apple-system, sans-serif',
                lineHeight: 1.5,
              }}
            >
              {stringValue}
            </Text>
          )
        },
      })),
    [data.columns],
  )

  const reactTable = useReactTable({
    data: data.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <Box
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8f9fa',
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
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Title
                  order={2}
                  fw={600}
                  c="gray.9"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
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
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              <Table
                striped
                highlightOnHover
                withColumnBorders
                verticalSpacing="xs"
                horizontalSpacing="lg"
                style={{
                  borderCollapse: 'separate',
                }}
                styles={{
                  thead: {
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                  },
                  th: {
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    backgroundColor: 'transparent',
                  },
                  td: {
                    padding: '10px 16px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
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
                      <td colSpan={columns.length}>
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
            <Group
              justify="space-between"
              align="center"
              mt="lg"
              pt="md"
              style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}
            >
              <Text
                size="xs"
                c="gray.6"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                Displaying {data.rows.length.toLocaleString()} of{' '}
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
                {data.columns.length} × {data.rows.length}
              </Text>
            </Group>
          </Box>
        </Box>

        {/* Agent Sidebar - Fixed on Right */}
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
          }}
        >
          <AgentEditor
            input={agentInput}
            onInputChange={setAgentInput}
            onExecute={handleAgentAction}
            error={agentError}
            onErrorClose={() => setAgentError(null)}
            isExecuting={isAgentExecuting}
            description={agentDescription}
            messages={messages}
          />
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
          <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
            <QueryEditor
              query={query}
              onQueryChange={setQuery}
              onExecute={handleExecuteQuery}
              error={error}
              onErrorClose={() => setError(null)}
              isExecuting={isExecuting}
            />
          </Box>
        </Box>
      </Box>
    </>
  )
}
