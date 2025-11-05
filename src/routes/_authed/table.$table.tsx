import {
  queryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { queryDuckDB } from '~/utils/duckdb'
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
  Card,
  Divider,
} from '@mantine/core'
import { QueryEditor } from '~/components/QueryEditor'
import { AgentEditor } from '~/components/AgentEditor'
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

  // Agent box state (for future use)
  const [agentInput, setAgentInput] = useState('')
  const [isAgentExecuting, setIsAgentExecuting] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)

  const handleExecuteQuery = async () => {
    setIsExecuting(true)
    setError(null)
    try {
      // Execute the query
      await queryDuckDB({ data: query })

      // Invalidate the table query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['tables', table] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }

  // Placeholder for agent action
  const handleAgentAction = async () => {
    setIsAgentExecuting(true)
    setAgentError(null)
    // TODO: Implement agent logic here
    setTimeout(() => {
      setIsAgentExecuting(false)
      setAgentError('Agent functionality not implemented yet.')
    }, 500)
  }

  const columns = useMemo<ColumnDef<Record<string, any>>[]>(
    () =>
      data.columns.map((col) => ({
        accessorKey: col.name,
        header: () => (
          <Group>
            <Text fw={600}>{col.name}</Text>
          </Group>
        ),
        cell: (info) => {
          const value = info.getValue()
          if (value === null || value === undefined) {
            return (
              <Text c="gray" fs="italic" size="sm">
                NULL
              </Text>
            )
          }
          return <Text size="sm">{String(value)}</Text>
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
    <Box p="lg" style={{ position: 'relative', minHeight: '100vh' }}>
      <Card>
        <Group justify="space-between" mb="md">
          <Title order={2}>{table}</Title>
          <Badge color="blue" size="md" variant="light">
            {data.rows.length} row{data.rows.length === 1 ? '' : 's'}
          </Badge>
        </Group>
        <Divider mb="md" />
        <ScrollArea type="auto" offsetScrollbars>
          <Table
            striped
            highlightOnHover
            withColumnBorders
            verticalSpacing="sm"
            horizontalSpacing="md"
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
        <Text mt="md" size="sm" c="gray.6">
          Showing {data.rows.length} row{data.rows.length === 1 ? '' : 's'}
        </Text>
      </Card>

      {/* Persistent Bottom Bar with Two Editors */}
      <Box
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          background: 'rgba(255,255,255,0.98)',
          padding: '16px 24px',
        }}
      >
        <Group
          align="flex-end"
          justify="center"
          gap="xl"
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          <QueryEditor
            query={query}
            onQueryChange={setQuery}
            onExecute={handleExecuteQuery}
            error={error}
            onErrorClose={() => setError(null)}
            isExecuting={isExecuting}
          />
          <AgentEditor
            input={agentInput}
            onInputChange={setAgentInput}
            onExecute={handleAgentAction}
            error={agentError}
            onErrorClose={() => setAgentError(null)}
            isExecuting={isAgentExecuting}
          />
        </Group>
      </Box>
    </Box>
  )
}
