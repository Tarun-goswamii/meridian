import { Table, ScrollArea, Text } from '@mantine/core'
import { flexRender, type Table as ReactTable } from '@tanstack/react-table'

interface DataTableProps {
  table: ReactTable<Record<string, any>>
  visibleColumnsCount: number
}

export function DataTable({ table, visibleColumnsCount }: DataTableProps) {
  const isEmpty = table.getRowModel().rows.length === 0

  return (
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
          minWidth: Math.max(960, visibleColumnsCount * 160),
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
          withRowBorders
          withTableBorder
          stickyHeader
          verticalSpacing="xs"
          horizontalSpacing="sm"
          style={{
            borderCollapse: 'separate',
            tableLayout: 'fixed',
            minWidth:
              visibleColumnsCount < 8
                ? undefined
                : visibleColumnsCount * 150,
            maxWidth: 2600,
          }}
          styles={(theme) => ({
            table: {
              borderRadius: theme.radius.sm,
              overflow: 'hidden',
            },
            thead: {
              backgroundColor: theme.colors.gray[0],
              borderBottom: `2px solid ${theme.colors.gray[3]}`,
              zIndex: 2,
              top: 0,
              position: 'sticky',
            },
            th: {
              padding: '10px 12px',
              backgroundColor: 'rgba(250,250,250,0.98)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.2,
              whiteSpace: 'nowrap',
              maxWidth: 320,
            },
            td: {
              padding: '8px 12px',
              fontSize: 12,
              lineHeight: 1.5,
              maxWidth: 320,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              backgroundColor: theme.white,
            },
            tr: {
              '&:hover': {
                backgroundColor: 'rgba(75, 119, 190, 0.08)',
              },
            },
          })}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id} scope="col">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {isEmpty ? (
              <Table.Tr>
                <Table.Td colSpan={visibleColumnsCount}>
                  <Text c="dimmed" ta="center" py="md">
                    No data available
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </ScrollArea>
  )
}

