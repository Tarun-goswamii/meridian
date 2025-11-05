import { useRef, useEffect } from 'react'
import { Stack, Group, Text, Textarea, Button, Alert, Box } from '@mantine/core'
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const minHeight = 60 // ~3 lines
      const maxHeight = 200 // ~8 lines
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }

    // Adjust on query change
    adjustHeight()

    // Also adjust on any content changes
    const observer = new MutationObserver(adjustHeight)
    observer.observe(textarea, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    // Adjust when window resizes
    window.addEventListener('resize', adjustHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', adjustHeight)
    }
  }, [query])

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
    <Box
      p="md"
      style={{
        width: '100%',
        maxWidth: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.3)',
        borderRadius: 'var(--mantine-radius-lg)',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTerminal
              size={18}
              style={{ color: 'var(--mantine-color-blue-6)' }}
            />
            <Text fw={600} size="xs">
              DuckDB Query Editor
            </Text>
          </Group>
        </Group>

        {error && (
          <Alert
            color="red"
            title="Query Error"
            onClose={onErrorClose}
            withCloseButton
            variant="light"
            styles={{
              root: {
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              },
            }}
          >
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        <Box>
          <Textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => onQueryChange(e.currentTarget.value)}
            placeholder="UPDATE table_name SET column_name = value WHERE condition..."
            styles={{
              input: {
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                fontSize: '14px',
                lineHeight: 1.6,
                padding: '12px 14px',
                backgroundColor: 'rgba(246, 246, 246, 0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                minHeight: '60px',
                maxHeight: '120px',
                resize: 'none',
                overflow: 'auto',
                '&:focus': {
                  borderColor: 'rgba(59, 130, 246, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                },
              },
            }}
          />
        </Box>

        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            Press Ctrl+Enter (Cmd+Enter on Mac) to execute query
          </Text>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={onExecute}
            loading={isExecuting}
            disabled={!query.trim()}
            size="xs"
            variant="filled"
          >
            Execute
          </Button>
        </Group>
      </Stack>
    </Box>
  )
}
