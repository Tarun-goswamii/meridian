import { ActionIcon, Checkbox, Menu } from '@mantine/core'
import { IconColumns } from '@tabler/icons-react'
import type { ColumnDef } from '@tanstack/react-table'

interface ColumnsMenuProps {
  columns: ColumnDef<Record<string, any>>[]
  columnVisibility: Record<string, boolean>
  onVisibilityChange: (visibility: Record<string, boolean>) => void
}

export function ColumnsMenu({
  columns,
  columnVisibility,
  onVisibilityChange,
}: ColumnsMenuProps) {
  if (columns.length <= 10) return null

  return (
    <Menu
      shadow="md"
      width={260}
      withinPortal
      withArrow
      position="bottom-end"
      offset={2}
    >
      <Menu.Target>
        <ActionIcon
          variant="light"
          color="gray"
          size="md"
          style={{ marginLeft: 8 }}
          aria-label="Show/hide columns"
        >
          <IconColumns size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown style={{ maxHeight: 350, overflowY: 'auto' }}>
        <Menu.Label>Show/Hide Columns</Menu.Label>
        {columns.map((col) =>
          'accessorKey' in col && typeof col.accessorKey === 'string' ? (
            <Menu.Item
              key={col.accessorKey}
              style={{
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 2,
                paddingBottom: 2,
              }}
            >
              <Checkbox
                label={String(col.accessorKey)}
                size="xs"
                checked={columnVisibility[col.accessorKey] !== false}
                onChange={() => {
                  onVisibilityChange({
                    ...columnVisibility,
                    [col.accessorKey]: !(columnVisibility[col.accessorKey] !== false),
                  })
                }}
              />
            </Menu.Item>
          ) : null,
        )}
        <Menu.Divider />
        <Menu.Item
          color="gray"
          onClick={() =>
            onVisibilityChange(
              Object.fromEntries(
                columns.map((col) => [
                  'accessorKey' in col && typeof col.accessorKey === 'string'
                    ? col.accessorKey
                    : '',
                  true,
                ]),
              ),
            )
          }
        >
          Show all
        </Menu.Item>
        <Menu.Item
          color="gray"
          onClick={() =>
            onVisibilityChange(
              Object.fromEntries(
                columns.map((col) => [
                  'accessorKey' in col && typeof col.accessorKey === 'string'
                    ? col.accessorKey
                    : '',
                  false,
                ]),
              ),
            )
          }
        >
          Hide all
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

