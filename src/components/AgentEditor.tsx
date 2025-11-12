import { useRef, useEffect, useState } from 'react'
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
  Collapse,
  ActionIcon,
  Badge,
  SegmentedControl,
} from '@mantine/core'
import {
  IconSparkles,
  IconPlayerPlay,
  IconUser,
  IconChevronDown,
  IconChevronUp,
  IconCode,
} from '@tabler/icons-react'
import { CustomMarkdown } from './Markdown'

interface ToolStep {
  tool: string
  args: any
  result?: any
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  commands?: string[]
  toolSteps?: ToolStep[]
  mode?: 'query' | 'analysis'
}

interface MessagePairProps {
  user: Message
  assistant?: Message
}

function MessagePair({ user, assistant }: MessagePairProps) {
  const [commandsExpanded, setCommandsExpanded] = useState(false)

  return (
    <Box
      p="sm"
      style={{
        backgroundColor: 'rgb(253, 253, 253)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 'var(--mantine-radius-md)',
        border: '1px solid rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
      }}
    >
      <Stack gap="xs">
        {/* User Query */}
        <Box>
          <Group gap="xs" mb={4}>
            <Avatar size="xs" radius="xl" color="blue" variant="light">
              <IconUser size={12} />
            </Avatar>
            <Text size="xs" fw={500} c="dimmed">
              You
            </Text>
          </Group>
          <Text
            size="xs"
            style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
            pl={24}
          >
            {user.content}
          </Text>
        </Box>

        {/* Assistant Response */}
        {assistant && (
          <>
            <Divider style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }} />
            <Box>
              <Group gap="xs" mb={4}>
                <Avatar size="xs" radius="xl" color="violet" variant="light">
                  <IconSparkles size={12} />
                </Avatar>
                <Text size="xs" fw={500} c="dimmed">
                  Agent
                </Text>
              </Group>
              <Text
                size="xs"
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                pl={24}
              >
                <CustomMarkdown>{assistant.content}</CustomMarkdown>
              </Text>

              {/* Tool Steps */}
              {assistant.toolSteps && assistant.toolSteps.length > 0 && (
                <Box mt="xs" pl={24}>
                  <Group gap="xs" mb={4}>
                    <IconCode
                      size={12}
                      style={{ color: 'var(--mantine-color-blue-6)' }}
                    />
                    <Text size="xs" c="blue" fw={500}>
                      Tool Usage ({assistant.toolSteps.length})
                    </Text>
                  </Group>
                  <Stack gap="xs">
                    {assistant.toolSteps.map((step, idx) => (
                      <Box
                        key={idx}
                        p="xs"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          borderRadius: 'var(--mantine-radius-xs)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        <Text size="xs" fw={500} c="blue" mb={4}>
                          {step.tool}
                        </Text>
                        {step.args && (
                          <Text size="xs" c="dimmed" mb={4}>
                            Args: {JSON.stringify(step.args, null, 2)}
                          </Text>
                        )}
                        {step.result && (
                          <Text size="xs" c="dimmed">
                            Result:{' '}
                            {JSON.stringify(step.result, null, 2).substring(
                              0,
                              200,
                            )}
                            {JSON.stringify(step.result, null, 2).length > 200
                              ? '...'
                              : ''}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Collapsible Commands */}
              {assistant.commands && assistant.commands.length > 0 && (
                <Box mt="xs" pl={24}>
                  <Group
                    gap="xs"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setCommandsExpanded(!commandsExpanded)}
                  >
                    <ActionIcon size="xs" variant="subtle" color="gray">
                      {commandsExpanded ? (
                        <IconChevronUp size={14} />
                      ) : (
                        <IconChevronDown size={14} />
                      )}
                    </ActionIcon>
                    <Group gap={4}>
                      <IconCode
                        size={12}
                        style={{ color: 'var(--mantine-color-gray-6)' }}
                      />
                      <Text size="xs" c="dimmed" fw={500}>
                        SQL Commands ({assistant.commands.length})
                      </Text>
                    </Group>
                  </Group>
                  <Collapse in={commandsExpanded}>
                    <Box
                      mt="xs"
                      p="xs"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.03)',
                        borderRadius: 'var(--mantine-radius-sm)',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                    >
                      <Stack gap="xs">
                        {assistant.commands.map((cmd, idx) => (
                          <Box
                            key={idx}
                            p="xs"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.5)',
                              borderRadius: 'var(--mantine-radius-xs)',
                              border: '1px solid rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            <Group gap="xs" align="flex-start">
                              <Badge
                                size="xs"
                                variant="dot"
                                color="gray"
                                style={{
                                  minWidth: 20,
                                  textAlign: 'center',
                                  fontSize: '10px',
                                }}
                              >
                                {idx + 1}
                              </Badge>
                              <Text
                                size="xs"
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.5,
                                  fontFamily:
                                    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                  flex: 1,
                                  wordBreak: 'break-word',
                                }}
                                c="dimmed"
                              >
                                {cmd}
                              </Text>
                            </Group>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Box>
  )
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
  commandQueue?: string[]
  currentCommandIndex?: number
  mode?: 'query' | 'analysis'
  onModeChange?: (mode: 'query' | 'analysis') => void
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
  commandQueue = [],
  currentCommandIndex = 0,
  mode = 'query',
  onModeChange,
}: AgentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [queueExpanded, setQueueExpanded] = useState(false)

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
      p={0}
      style={{
        width: '100%',
        minWidth: 320,
        maxWidth: '100%',
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
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconSparkles
                  size={20}
                  style={{ color: 'var(--mantine-color-blue-6)' }}
                />
                <Text fw={600} size="sm">
                  AI Agent
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
                  onClick={() => setQueueExpanded(!queueExpanded)}
                >
                  {queueExpanded ? (
                    <IconChevronUp size={16} />
                  ) : (
                    <IconChevronDown size={16} />
                  )}
                </ActionIcon>
              )}
            </Group>
            {onModeChange && (
              <SegmentedControl
                value={mode}
                onChange={(value) =>
                  onModeChange(value as 'query' | 'analysis')
                }
                data={[
                  {
                    value: 'query',
                    label: 'Query Agent',
                  },
                  {
                    value: 'analysis',
                    label: 'Analysis Agent',
                  },
                ]}
                size="xs"
                fullWidth
              />
            )}
          </Stack>
        </Box>

        {/* Command Queue Status */}
        {remainingCommands.length > 0 && (
          <Box px="md" pt="xs">
            <Collapse in={queueExpanded}>
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
                  <IconCode
                    size={14}
                    style={{ color: 'var(--mantine-color-blue-6)' }}
                  />
                  <Text size="xs" fw={500} c="blue">
                    Remaining ({remainingCommands.length})
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
                            style={{
                              minWidth: 20,
                              textAlign: 'center',
                              fontSize: '10px',
                            }}
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
                            {cmd.length > 60 ? cmd.slice(0, 60) + '…' : cmd}
                          </Text>
                        </Group>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        )}

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

            {messages
              .reduce<Array<{ user: Message; assistant?: Message }>>(
                (acc, msg) => {
                  if (msg.role === 'user') {
                    acc.push({ user: msg })
                  } else if (msg.role === 'assistant' && acc.length > 0) {
                    acc[acc.length - 1].assistant = msg
                  }
                  return acc
                },
                [],
              )
              .map((pair, idx) => (
                <MessagePair
                  key={idx}
                  user={pair.user}
                  assistant={pair.assistant}
                />
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
