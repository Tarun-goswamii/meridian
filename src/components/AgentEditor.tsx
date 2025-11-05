import { useRef, useEffect } from 'react'
import {
  Paper,
  Stack,
  Group,
  Text,
  Textarea,
  Button,
  Alert,
  Box,
} from '@mantine/core'
import { IconTerminal, IconPlayerPlay } from '@tabler/icons-react'

interface AgentEditorProps {
  input: string
  onInputChange: (input: string) => void
  onExecute: () => Promise<void>
  error: string | null
  onErrorClose: () => void
  isExecuting: boolean
  description?: string
}

export function AgentEditor({
  input,
  onInputChange,
  onExecute,
  error,
  onErrorClose,
  isExecuting,
  description,
}: AgentEditorProps) {
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
          <Text fw={600}>Agent</Text>
        </Group>
        {error && (
          <Alert
            color="red"
            title="Agent Error"
            onClose={onErrorClose}
            withCloseButton
            mb="xs"
          >
            {error}
          </Alert>
        )}
        {description && (
          <Box
            p="xs"
            style={{
              backgroundColor: 'var(--mantine-color-blue-light)',
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-blue-light-color)',
            }}
          >
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </Box>
        )}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.currentTarget.value)}
          placeholder="Enter agent command..."
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
            Press Ctrl+Enter to run agent
          </Text>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={onExecute}
            loading={isExecuting}
            disabled={!input.trim()}
            size="sm"
          >
            Run Agent
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
