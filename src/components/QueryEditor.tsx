import { useRef, useEffect } from 'react'
import {
  Paper,
  Stack,
  Group,
  Text,
  Textarea,
  Button,
  Alert,
} from '@mantine/core'
import { IconTerminal, IconPlayerPlay } from '@tabler/icons-react'

interface QueryEditorProps {
  query: string
  onQueryChange: (query: string) => void
  onExecute: () => Promise<void>
  error: string | null
  onErrorClose: () => void
  isExecuting: boolean
}

export function QueryEditor({
  query,
  onQueryChange,
  onExecute,
  error,
  onErrorClose,
  isExecuting,
}: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement === textareaRef.current &&
        (e.ctrlKey || e.metaKey) &&
        e.key === 'Enter'
      ) {
        e.preventDefault()
        onExecute()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onExecute])

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      style={{ width: 400, minWidth: 260, maxWidth: '45vw' }}
    >
      <Stack gap="xs">
        <Group gap="xs">
          <IconTerminal size={18} />
          <Text fw={600}>DuckDB Query</Text>
        </Group>
        {error && (
          <Alert
            color="red"
            title="Query Error"
            onClose={onErrorClose}
            withCloseButton
            mb="xs"
          >
            {error}
          </Alert>
        )}
        <Textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          placeholder="Enter DuckDB query..."
          minRows={3}
          maxRows={6}
          styles={{
            input: {
              fontFamily: 'monospace',
              fontSize: '13px',
            },
          }}
        />
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Press Ctrl+Enter to execute
          </Text>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={onExecute}
            loading={isExecuting}
            disabled={!query.trim()}
            size="sm"
          >
            Execute
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
