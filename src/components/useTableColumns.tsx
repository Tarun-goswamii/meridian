import { useMemo } from 'react'
import { Group, Text, Badge, Tooltip } from '@mantine/core'
import type { ColumnDef } from '@tanstack/react-table'

interface Column {
  name: string
  type: string
}

export function useTableColumns(
  columns: Column[],
): ColumnDef<Record<string, any>>[] {
  return useMemo<ColumnDef<Record<string, any>>[]>(
    () =>
      columns.map((col) => ({
        accessorKey: col.name,
        header: () => (
          <Group
            gap={4}
            align="center"
            style={{ minWidth: 100, maxWidth: 320, overflow: 'hidden' }}
          >
            <Tooltip
              label={col.type}
              withArrow
              position="top"
              openDelay={300}
              multiline
              maw={260}
            >
              <Text
                fw={600}
                size="xs"
                c="gray.9"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {col.name}
              </Text>
            </Tooltip>
            <Badge
              size="xs"
              variant="dot"
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
              size="xs"
              c={isNumeric ? 'gray.8' : 'gray.9'}
              style={{
                fontFamily: isNumeric
                  ? 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
                  : 'system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 260,
                lineHeight: 1.5,
              }}
              title={stringValue.length > 60 ? stringValue : undefined}
            >
              {stringValue.length > 60
                ? stringValue.slice(0, 60) + '…'
                : stringValue}
            </Text>
          )
        },
        enableHiding: true,
      })),
    [columns],
  )
}
