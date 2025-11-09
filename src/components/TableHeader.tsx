import { Title, Group, Badge } from '@mantine/core'
import { ColumnsMenu } from './ColumnsMenu'
import type { ColumnDef } from '@tanstack/react-table'

interface TableHeaderProps {
  tableName: string
  columnCount: number
  rowCount: number
  columns: ColumnDef<Record<string, any>>[]
  columnVisibility: Record<string, boolean>
  onVisibilityChange: (visibility: Record<string, boolean>) => void
}

export function TableHeader({
  tableName,
  columnCount,
  rowCount,
  columns,
  columnVisibility,
  onVisibilityChange,
}: TableHeaderProps) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap">
      <Group gap="xs">
        <Title
          order={2}
          fw={600}
          c="gray.9"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: 350,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
          title={tableName}
        >
          {tableName}
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
          {columnCount} column{columnCount === 1 ? '' : 's'}
        </Badge>
        <ColumnsMenu
          columns={columns}
          columnVisibility={columnVisibility}
          onVisibilityChange={onVisibilityChange}
        />
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
        {rowCount.toLocaleString()} row{rowCount === 1 ? '' : 's'}
      </Badge>
    </Group>
  )
}

