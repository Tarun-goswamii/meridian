import { Table, ScrollArea, Text } from '@mantine/core'
import { flexRender, type Table as ReactTable } from '@tanstack/react-table'

interface DataTableProps {
  table: ReactTable<Record<string, any>>
  visibleColumnsCount: number
}

export function DataTable({ table, visibleColumnsCount }: DataTableProps) {
  const minViewportWidth = Math.max(960, visibleColumnsCount * 140)
  const minTableWidth =
    visibleColumnsCount < 8 ? undefined : visibleColumnsCount * 140

  return (
    <ScrollArea.Autosize
      type="auto"
      offsetScrollbars
      scrollHideDelay={300}
      scrollbarSize={10}
      mah="calc(100vh - 220px)"
      mih={300}
      style={{
        borderRadius: 4,
        background: 'white',
        width: '100%',
      }}
      viewportProps={{
        style: {
          paddingBottom: 4,
        },
      }}
    >
      <div
        style={{
          minWidth: minViewportWidth,
        }}
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
            minWidth: minTableWidth,
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
      </div>
    </ScrollArea.Autosize>
  )
}

