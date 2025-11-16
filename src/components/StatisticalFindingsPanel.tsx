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
  Grid,
  Paper,
  Stack,
  RingProgress,
  Progress,
  Box,
  Divider,
  ThemeIcon,
} from '@mantine/core'
import {
  IconChevronDown,
  IconChevronRight,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconChartBar,
} from '@tabler/icons-react'
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

// Helper function to format numbers
function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K'
  }
  return num.toFixed(decimals)
}

// Helper function to calculate coefficient of variation (CV)
function getCoefficientOfVariation(mean: number, stdDev: number): number {
  if (mean === 0) return 0
  return (stdDev / mean) * 100
}

// Helper function to get color based on CV (variability)
function getVariabilityColor(cv: number): string {
  if (cv < 15) return 'green'
  if (cv < 30) return 'yellow'
  if (cv < 50) return 'orange'
  return 'red'
}

// Stat Card Component
function StatCard({
  title,
  value,
  description,
  icon,
  color = 'blue',
  trend,
}: {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  const TrendIcon =
    trend === 'up'
      ? IconTrendingUp
      : trend === 'down'
        ? IconTrendingDown
        : IconMinus

  return (
    <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
      <Group justify="space-between">
        <div style={{ flex: 1 }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            {title}
          </Text>
          <Text fw={700} size="xl" mt="xs">
            {typeof value === 'number' ? formatNumber(value) : value}
          </Text>
          {description && (
            <Text size="xs" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </div>
        {icon && (
          <ThemeIcon
            color={color}
            variant="light"
            style={{ width: 60, height: 60 }}
            radius="md"
          >
            {icon}
          </ThemeIcon>
        )}
        {trend && (
          <ThemeIcon
            color={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}
            variant="light"
            size="sm"
            radius="xl"
          >
            <TrendIcon size={16} />
          </ThemeIcon>
        )}
      </Group>
    </Paper>
  )
}

export function StatisticalFindingsPanel({
  findings,
}: {
  findings: StatisticalFinding[]
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'mean', desc: true },
  ])
  const [tableOpened, setTableOpened] = useState(false)

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
          finding: f,
        })),
    [findings],
  )

  // Calculate aggregate statistics
  const aggregateStats = useMemo(() => {
    if (data.length === 0) return null

    const totalCount = data.reduce((sum, d) => sum + (d.count || 0), 0)
    const avgMean =
      data.reduce((sum, d) => sum + (d.mean || 0), 0) / data.length
    const avgStdDev =
      data.reduce((sum, d) => sum + (d.stdDev || 0), 0) / data.length
    const totalRange = data.reduce(
      (sum, d) => sum + ((d.max || 0) - (d.min || 0)),
      0,
    )

    return {
      totalColumns: data.length,
      totalCount,
      avgMean,
      avgStdDev,
      totalRange,
    }
  }, [data])

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

  const numericFindings = data

  return (
    <Stack gap="md">
      {/* Overall Summary Stats Grid */}
      {aggregateStats && (
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Tooltip
              label="Number of columns in your dataset that contain numeric data and have statistical information available."
              withArrow
            >
              <div style={{ cursor: 'help' }}>
                <StatCard
                  title="Numeric Columns"
                  value={aggregateStats.totalColumns}
                  description="Columns with numeric data"
                  icon={<IconChartBar size={24} />}
                  color="blue"
                />
              </div>
            </Tooltip>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Tooltip
              label="Total number of data points across all numeric columns. This is the sum of the count from each column."
              withArrow
            >
              <div style={{ cursor: 'help' }}>
                <StatCard
                  title="Total Values"
                  value={aggregateStats.totalCount}
                  description="Sum of all data points"
                  icon={<IconChartBar size={24} />}
                  color="green"
                />
              </div>
            </Tooltip>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Tooltip
              label="Average of all mean values across numeric columns. Gives you a sense of the typical average value in your dataset."
              withArrow
            >
              <div style={{ cursor: 'help' }}>
                <StatCard
                  title="Average Mean"
                  value={aggregateStats.avgMean}
                  description="Across all columns"
                  icon={<IconChartBar size={24} />}
                  color="violet"
                />
              </div>
            </Tooltip>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Tooltip
              label="Average Standard Deviation across all columns. Standard deviation measures how spread out the data is. Higher values indicate more variability."
              withArrow
            >
              <div style={{ cursor: 'help' }}>
                <StatCard
                  title="Avg Std Dev"
                  value={aggregateStats.avgStdDev}
                  description="Average variability"
                  icon={<IconChartBar size={24} />}
                  color="orange"
                />
              </div>
            </Tooltip>
          </Grid.Col>
        </Grid>
      )}

      {/* Per-Column Stats Cards */}
      {numericFindings.length > 0 && (
        <>
          <Group justify="space-between" align="center">
            <Title order={5}>Column Statistics</Title>
            <Text size="xs" c="dimmed">
              {numericFindings.length} column
              {numericFindings.length !== 1 ? 's' : ''} with numeric data
            </Text>
          </Group>
          <Grid>
            {numericFindings.map((item) => {
              if (!item.finding.stats) return null

              const stats = item.finding.stats
              const cv = getCoefficientOfVariation(stats.mean, stats.stdDev)
              const range = stats.max - stats.min
              const medianPercent =
                range > 0 ? ((stats.median - stats.min) / range) * 100 : 0
              const meanPercent =
                range > 0 ? ((stats.mean - stats.min) / range) * 100 : 0

              return (
                <Grid.Col key={item.column} span={{ base: 12, sm: 6, md: 3 }}>
                  <Paper
                    withBorder
                    p="md"
                    radius="md"
                    style={{ height: '100%' }}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Text fw={600} size="sm" lineClamp={1}>
                            {item.column}
                          </Text>
                          <Text size="xs" c="dimmed" mt={2}>
                            {item.type}
                          </Text>
                        </div>
                        <Tooltip
                          label={`Coefficient of Variation: ${cv.toFixed(1)}%\n\nMeasures relative variability. Lower values (green) indicate more consistent data, while higher values (red) show greater spread. Calculated as (Standard Deviation / Mean) × 100.`}
                          multiline
                          w={250}
                          withArrow
                        >
                          <div>
                            <RingProgress
                              size={60}
                              thickness={6}
                              sections={[
                                {
                                  value: Math.min(cv, 100),
                                  color: getVariabilityColor(cv),
                                },
                              ]}
                              label={
                                <Text size="xs" ta="center" fw={700}>
                                  {cv.toFixed(0)}%
                                </Text>
                              }
                            />
                          </div>
                        </Tooltip>
                      </Group>

                      <Divider my="xs" />

                      <Group gap="xs" justify="space-between">
                        <Tooltip
                          label="Mean (Average): The sum of all values divided by the count. Represents the typical value in the dataset."
                          withArrow
                        >
                          <div>
                            <Text size="xs" c="dimmed">
                              Mean
                            </Text>
                            <Text fw={600} size="sm">
                              {stats.mean.toFixed(2)}
                            </Text>
                          </div>
                        </Tooltip>
                        <Tooltip
                          label="Median: The middle value when data is sorted. Half the values are above and half are below. Less affected by outliers than the mean."
                          withArrow
                        >
                          <div>
                            <Text size="xs" c="dimmed">
                              Median
                            </Text>
                            <Text fw={600} size="sm">
                              {stats.median.toFixed(2)}
                            </Text>
                          </div>
                        </Tooltip>
                        <Tooltip
                          label="Count: Total number of non-null values in this column."
                          withArrow
                        >
                          <div>
                            <Text size="xs" c="dimmed">
                              Count
                            </Text>
                            <Text fw={600} size="sm">
                              {stats.count}
                            </Text>
                          </div>
                        </Tooltip>
                      </Group>

                      <Box mt="xs">
                        <Tooltip
                          label="Distribution: Shows where the mean and median fall within the data range (min to max). The bar position indicates how close these values are to the minimum or maximum."
                          withArrow
                        >
                          <Text
                            size="xs"
                            c="dimmed"
                            mb={4}
                            style={{ cursor: 'help' }}
                          >
                            Distribution
                          </Text>
                        </Tooltip>
                        <Tooltip
                          label={`Mean position: ${meanPercent.toFixed(1)}% from minimum. Shows where the average value sits in the data range.`}
                          withArrow
                        >
                          <Group gap="xs" mb={4} style={{ cursor: 'help' }}>
                            <Text size="xs" c="dimmed" style={{ minWidth: 50 }}>
                              Mean:
                            </Text>
                            <Progress
                              value={meanPercent}
                              color="blue"
                              size="sm"
                              radius="xl"
                              style={{ flex: 1 }}
                            />
                            <Text size="xs" fw={500} style={{ minWidth: 50 }}>
                              {stats.mean.toFixed(1)}
                            </Text>
                          </Group>
                        </Tooltip>
                        <Tooltip
                          label={`Median position: ${medianPercent.toFixed(1)}% from minimum. Shows where the middle value sits in the data range.`}
                          withArrow
                        >
                          <Group gap="xs" style={{ cursor: 'help' }}>
                            <Text size="xs" c="dimmed" style={{ minWidth: 50 }}>
                              Median:
                            </Text>
                            <Progress
                              value={medianPercent}
                              color="violet"
                              size="sm"
                              radius="xl"
                              style={{ flex: 1 }}
                            />
                            <Text size="xs" fw={500} style={{ minWidth: 50 }}>
                              {stats.median.toFixed(1)}
                            </Text>
                          </Group>
                        </Tooltip>
                      </Box>

                      <Group gap={4} mt="xs">
                        <Tooltip
                          label="Minimum: The smallest value in this column."
                          withArrow
                        >
                          <Badge
                            size="xs"
                            variant="light"
                            color="gray"
                            style={{ cursor: 'help' }}
                          >
                            Min: {stats.min.toFixed(1)}
                          </Badge>
                        </Tooltip>
                        <Tooltip
                          label="Maximum: The largest value in this column."
                          withArrow
                        >
                          <Badge
                            size="xs"
                            variant="light"
                            color="gray"
                            style={{ cursor: 'help' }}
                          >
                            Max: {stats.max.toFixed(1)}
                          </Badge>
                        </Tooltip>
                      </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>
              )
            })}
          </Grid>
        </>
      )}

      {/* Detailed Table */}
      <Card withBorder p="md" radius="md">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconChartBar size={18} />
            <Title order={5}>Detailed Statistics Table</Title>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setTableOpened((o) => !o)}
            aria-label={
              tableOpened ? 'Hide detailed table' : 'Show detailed table'
            }
          >
            {tableOpened ? (
              <IconChevronDown size={16} />
            ) : (
              <IconChevronRight size={16} />
            )}
          </Button>
        </Group>
        <Collapse in={tableOpened}>
          <ScrollArea type="auto" style={{ marginBottom: 0 }}>
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
    </Stack>
  )
}
