import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { queryDuckDB } from '~/utils/duckdb'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMemo } from 'react'
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
  const tableQuery = useSuspenseQuery(tableQueryOptions(table))
  const data = tableQuery.data

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
    <Box p="lg">
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
    </Box>
  )
}
