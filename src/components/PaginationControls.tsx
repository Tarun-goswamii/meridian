import { Button, Group, Text } from '@mantine/core'

interface PaginationControlsProps {
  totalRows: number
  pageSize: number
  pageIndex: number
  onPageSizeChange: (size: number) => void
  onPageIndexChange: (index: number) => void
}

export function PaginationControls({
  totalRows,
  pageSize,
  pageIndex,
  onPageSizeChange,
  onPageIndexChange,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalRows / pageSize)
  const prevDisabled = pageIndex === 0
  const nextDisabled = pageIndex >= totalPages - 1

  // Only render if more than one page
  if (totalPages <= 1) return null

  return (
    <Group gap={8} align="center">
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onPageIndexChange(0)}
        disabled={prevDisabled}
      >
        First
      </Button>
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
        disabled={prevDisabled}
      >
        Prev
      </Button>
      <Text size="xs" c="gray.7">
        Page{' '}
        <strong>
          {pageIndex + 1} / {totalPages}
        </strong>
      </Text>
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onPageIndexChange(Math.min(totalPages - 1, pageIndex + 1))}
        disabled={nextDisabled}
      >
        Next
      </Button>
      <Button
        variant="subtle"
        size="xs"
        onClick={() => onPageIndexChange(totalPages - 1)}
        disabled={nextDisabled}
      >
        Last
      </Button>
      <Text size="xs" ml={24} c="gray.6">
        Rows per page:
      </Text>
      <select
        style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
        value={pageSize}
        onChange={(e) => {
          onPageSizeChange(Number(e.target.value))
          onPageIndexChange(0)
        }}
      >
        {[25, 50, 100, 250, 500, 1000].map((sz) => (
          <option key={sz} value={sz}>
            {sz}
          </option>
        ))}
      </select>
    </Group>
  )
}

