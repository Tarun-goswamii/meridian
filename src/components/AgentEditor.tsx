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
  ScrollArea,
} from '@mantine/core'
import { IconTerminal, IconPlayerPlay } from '@tabler/icons-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AgentEditorProps {
  input: string
  onInputChange: (input: string) => void
  onExecute: () => Promise<void>
  error: string | null
  onErrorClose: () => void
  isExecuting: boolean
  description?: string
  messages?: Message[]
}

export function AgentEditor({
  input,
  onInputChange,
  onExecute,
  error,
  onErrorClose,
  isExecuting,
  description,
  messages = [],
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
        {messages.length > 0 && (
          <ScrollArea h={120} type="auto">
            <Stack gap={4}>
              {messages.map((msg, idx) => (
                <Box
                  key={idx}
                  p={6}
                  style={{
                    backgroundColor:
                      msg.role === 'user'
                        ? 'var(--mantine-color-gray-0)'
                        : 'var(--mantine-color-blue-0)',
                    borderRadius: 4,
                  }}
                >
                  <Text size="xs" fw={500} mb={2}>
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </Text>
                  <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Text>
                </Box>
              ))}
            </Stack>
          </ScrollArea>
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
