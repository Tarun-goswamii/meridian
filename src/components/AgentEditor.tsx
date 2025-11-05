import { useRef, useEffect } from 'react'
import {
  Stack,
  Group,
  Text,
  Textarea,
  Button,
  Alert,
  Box,
  ScrollArea,
  Avatar,
  Divider,
} from '@mantine/core'
import { IconSparkles, IconPlayerPlay, IconUser } from '@tabler/icons-react'

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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const minHeight = 60 // ~3 lines
      const maxHeight = 240 // ~10 lines
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }

    // Adjust on input change
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
  }, [input])

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
      p={0}
      style={{
        width: 380,
        minWidth: 320,
        maxWidth: '30vw',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-lg)',
      }}
    >
      <Stack
        gap={0}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <Box
          p="md"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Group gap="xs">
            <IconSparkles
              size={20}
              style={{ color: 'var(--mantine-color-blue-6)' }}
            />
            <Text fw={600} size="sm">
              AI Agent
            </Text>
          </Group>
        </Box>

        {/* Messages Area */}
        <ScrollArea
          style={{ flex: 1, minHeight: 0 }}
          p="md"
          type="auto"
          offsetScrollbars
        >
          <Stack gap="md">
            {messages.length === 0 && !description && (
              <Box
                p="lg"
                style={{
                  textAlign: 'center',
                  color: 'var(--mantine-color-gray-6)',
                }}
              >
                <IconSparkles
                  size={32}
                  style={{
                    color: 'var(--mantine-color-gray-4)',
                    marginBottom: 8,
                    margin: '0 auto 8px',
                  }}
                />
                <Text size="sm" c="dimmed">
                  Start a conversation with the AI agent
                </Text>
              </Box>
            )}

            {messages.map((msg, idx) => (
              <Group
                key={idx}
                align="flex-start"
                gap="xs"
                wrap="nowrap"
                style={{
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <Avatar
                  size="sm"
                  radius="xl"
                  color={msg.role === 'user' ? 'blue' : 'violet'}
                  variant="light"
                >
                  {msg.role === 'user' ? (
                    <IconUser size={16} />
                  ) : (
                    <IconSparkles size={16} />
                  )}
                </Avatar>
                <Box
                  p="xs"
                  style={{
                    maxWidth: '85%',
                    backgroundColor:
                      msg.role === 'user'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: 'var(--mantine-radius-md)',
                    border:
                      msg.role === 'user'
                        ? '1px solid rgba(59, 130, 246, 0.2)'
                        : '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <Text size="xs" fw={500} mb={4} c="dimmed">
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </Text>
                  <Text
                    size="xs"
                    style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                  >
                    {msg.content}
                  </Text>
                </Box>
              </Group>
            ))}

            {description && messages.length === 0 && (
              <Box
                p="sm"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}
              >
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                  {description}
                </Text>
              </Box>
            )}
          </Stack>
        </ScrollArea>

        {error && (
          <Box px="md" pt="xs">
            <Alert
              color="red"
              title="Error"
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
              <Text size="xs">{error}</Text>
            </Alert>
          </Box>
        )}

        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

        {/* Input Area */}
        <Box
          p="md"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <Stack gap="xs">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.currentTarget.value)}
              placeholder="Ask the agent to help with your query..."
              styles={{
                input: {
                  fontSize: '13px',
                  lineHeight: 1.5,
                  padding: '10px 12px',
                  backgroundColor: 'rgba(246, 246, 246, 0.6)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  minHeight: '60px',
                  maxHeight: '240px',
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
            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                Ctrl+Enter to send
              </Text>
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={onExecute}
                loading={isExecuting}
                disabled={!input.trim()}
                size="xs"
                variant="filled"
              >
                Send
              </Button>
            </Group>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
