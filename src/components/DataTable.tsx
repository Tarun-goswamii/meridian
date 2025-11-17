import { Table, ScrollArea, Text } from '@mantine/core'
import { flexRender, type Table as ReactTable } from '@tanstack/react-table'

interface DataTableProps {
  table: ReactTable<Record<string, any>>
  visibleColumnsCount: number
}

export function DataTable({ table, visibleColumnsCount }: DataTableProps) {
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
          verticalSpacing="sm"
          horizontalSpacing="sm"
          style={{
            borderCollapse: 'separate',
            tableLayout: 'auto',
            minWidth:
              visibleColumnsCount < 8 ? undefined : visibleColumnsCount * 140,
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
            {table.getHeaderGroups().map((headerGroup) => (
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnsCount}>
                  <Text c="dimmed" ta="center" py="md">
                    No data available
                  </Text>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
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
  )
}

