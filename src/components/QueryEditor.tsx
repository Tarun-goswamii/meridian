import { useRef, useEffect, useState } from 'react'
import {
  Stack,
  Group,
  Text,
  Textarea,
  Button,
  Alert,
  Box,
  Collapse,
  ActionIcon,
  Badge,
} from '@mantine/core'
import {
  IconTerminal,
  IconPlayerPlay,
  IconChevronDown,
  IconChevronUp,
  IconList,
} from '@tabler/icons-react'

interface QueryEditorProps {
  query: string
  onQueryChange: (query: string) => void
  onExecute: () => Promise<void>
  error: string | null
  onErrorClose: () => void
  isExecuting: boolean
  commandQueue?: string[]
  currentCommandIndex?: number
}

export function QueryEditor({
  query,
  onQueryChange,
  onExecute,
  error,
  onErrorClose,
  isExecuting,
  commandQueue = [],
  currentCommandIndex = 0,
}: QueryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [commandsExpanded, setCommandsExpanded] = useState(false)

  const remainingCommands = commandQueue.slice(currentCommandIndex + 1)

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
            {commandQueue.length > 0 && (
              <Badge
                size="xs"
                variant="light"
                color="blue"
                style={{ fontWeight: 500 }}
              >
                {currentCommandIndex + 1} / {commandQueue.length}
              </Badge>
            )}
          </Group>
          {remainingCommands.length > 0 && (
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => setCommandsExpanded(!commandsExpanded)}
            >
              {commandsExpanded ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )}
            </ActionIcon>
          )}
        </Group>

        {remainingCommands.length > 0 && (
          <Collapse in={commandsExpanded}>
            <Box
              p="xs"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 'var(--mantine-radius-sm)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              <Group gap="xs" mb={4}>
                <IconList size={14} style={{ color: 'var(--mantine-color-blue-6)' }} />
                <Text size="xs" fw={500} c="blue">
                  Remaining Commands ({remainingCommands.length})
                </Text>
              </Group>
              <Stack gap={4}>
                {remainingCommands.map((cmd, idx) => {
                  const actualIndex = currentCommandIndex + 1 + idx
                  return (
                    <Box
                      key={idx}
                      p="xs"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: 'var(--mantine-radius-xs)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Group gap="xs" align="flex-start">
                        <Badge
                          size="xs"
                          variant="dot"
                          color="gray"
                          style={{ minWidth: 24, textAlign: 'center' }}
                        >
                          {actualIndex + 1}
                        </Badge>
                        <Text
                          size="xs"
                          style={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                            flex: 1,
                            wordBreak: 'break-word',
                          }}
                          c="dimmed"
                        >
                          {cmd.length > 80 ? cmd.slice(0, 80) + '…' : cmd}
                        </Text>
                      </Group>
                    </Box>
                  )
                })}
              </Stack>
            </Box>
          </Collapse>
        )}

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
