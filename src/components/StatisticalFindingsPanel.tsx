import { useState, useMemo } from 'react'
import {
  Card,
  Title,
  Collapse,
  Button,
  Group,
  ScrollArea,
  Table as MantineTable,
  Tooltip,
  Text,
  Badge,
} from '@mantine/core'
import { IconChevronDown, IconChevronRight, Icon123 } from '@tabler/icons-react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  getSortedRowModel,
} from '@tanstack/react-table'

type StatisticalFinding = {
  columnName: string
  columnType: string
  hasNumericData: boolean
  stats?: {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    q1: number
    q3: number
    iqr: number
    count: number
  }
}

export function StatisticalFindingsPanel({
  findings,
}: {
  findings: StatisticalFinding[]
}) {
  const [opened, setOpened] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'mean', desc: true },
  ])

  const data = useMemo(
    () =>
      findings
        .filter((f) => f.hasNumericData && f.stats)
        .map((f) => ({
          column: f.columnName,
          mean: f.stats?.mean,
          median: f.stats?.median,
          stdDev: f.stats?.stdDev,
          min: f.stats?.min,
          max: f.stats?.max,
          q1: f.stats?.q1,
          q3: f.stats?.q3,
          iqr: f.stats?.iqr,
          count: f.stats?.count,
          type: f.columnType,
        })),
    [findings],
  )

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: 'column',
        header: () => (
          <Group gap={4}>
            <Text fw={500}>Column</Text>
          </Group>
        ),
        cell: (info) => (
          <Group gap={4}>
            <Text fw={500}>{info.getValue()}</Text>
          </Group>
        ),
        size: 180,
      },
      {
        accessorKey: 'mean',
        header: () => (
          <Tooltip label="Mean (average)">
            <Text>Mean</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Badge color="blue" variant="light">
              {Number(info.getValue()).toFixed(2)}
            </Badge>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'median',
        header: () => (
          <Tooltip label="Median (middle value)">
            <Text>Median</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Badge color="indigo" variant="light">
              {Number(info.getValue()).toFixed(2)}
            </Badge>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'stdDev',
        header: () => (
          <Tooltip label="Standard Deviation">
            <Text>Std Dev</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Text>{Number(info.getValue()).toFixed(2)}</Text>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'min',
        header: () => (
          <Tooltip label="Minimum value">
            <Text>Min</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Text>{Number(info.getValue()).toFixed(2)}</Text>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'max',
        header: () => (
          <Tooltip label="Maximum value">
            <Text>Max</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Text>{Number(info.getValue()).toFixed(2)}</Text>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'q1',
        header: () => (
          <Tooltip label="First quartile (Q1)">
            <Text>Q1</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Text>{Number(info.getValue()).toFixed(2)}</Text>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'q3',
        header: () => (
          <Tooltip label="Third quartile (Q3)">
            <Text>Q3</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Text>{Number(info.getValue()).toFixed(2)}</Text>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'iqr',
        header: () => (
          <Tooltip label="Interquartile Range (Q3 - Q1)">
            <Text>IQR</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Text>{Number(info.getValue()).toFixed(2)}</Text>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 90,
      },
      {
        accessorKey: 'count',
        header: () => (
          <Tooltip label="Number of values">
            <Text>Count</Text>
          </Tooltip>
        ),
        cell: (info) =>
          info.getValue() !== undefined ? (
            <Badge color="gray" variant="light">
              {info.getValue()}
            </Badge>
          ) : (
            <Text c="dimmed">—</Text>
          ),
        size: 70,
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    debugTable: false,
  })

  if (!findings || findings.length === 0) {
    return null
  }

  return (
    <Card withBorder mb={0} p="md" radius="sm">
      <Group justify="space-between" mb="xs">
        <Title order={5}>Statistical Summary</Title>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setOpened((o) => !o)}
          aria-label={
            opened ? 'Hide statistical summary' : 'Show statistical summary'
          }
        >
          {opened ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </Button>
      </Group>
      <Collapse in={opened}>
        <ScrollArea type="auto" h={320} style={{ marginBottom: 0 }}>
          <MantineTable
            striped
            highlightOnHover
            withColumnBorders
            horizontalSpacing="md"
            verticalSpacing="xs"
            style={{
              minWidth: 900,
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--mantine-color-body)',
            }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        cursor: header.column.getCanSort()
                          ? 'pointer'
                          : undefined,
                        background: 'var(--mantine-color-gray-1)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 14,
                        padding: 8,
                        userSelect: 'none',
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <Group gap={4} wrap="nowrap">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === 'asc' && (
                          <IconChevronDown
                            size={14}
                            style={{ transform: 'rotate(180deg)' }}
                          />
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <IconChevronDown size={14} />
                        )}
                      </Group>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <Text c="dimmed" ta="center" py="md">
                      No numeric columns found.
                    </Text>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          padding: 8,
                          fontSize: 13,
                          background: 'var(--mantine-color-body)',
                        }}
                      >
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
          </MantineTable>
        </ScrollArea>
      </Collapse>
    </Card>
  )
}
