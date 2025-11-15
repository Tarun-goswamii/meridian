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
  Select,
} from '@mantine/core'
import {
  IconSparkles,
  IconPlayerPlay,
  IconUser,
  IconChevronDown,
  IconChevronUp,
  IconCode,
  IconPlus,
} from '@tabler/icons-react'
import { CustomMarkdown } from './Markdown'

interface ToolStep {
  tool: string
  args: any
  result?: any
  finished: boolean
}

interface AgentThreadSummary {
  agentThreadId: string
  title?: string | null
  lastMessageSummary?: string | null
  lastMessageAt?: number
  lastMode?: 'query' | 'analysis'
  agentName?: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  description?: string
  commands?: string[]
  toolSteps?: ToolStep[]
  mode?: 'query' | 'analysis'
  agentName?: string
  createdAt?: number
}

interface MessagePairProps {
  user: Message
  assistant?: Message
}

function MessagePair({ user, assistant }: MessagePairProps) {
  const [commandsExpanded, setCommandsExpanded] = useState(false)
  // Add expand/collapse state for each tool step
  const [toolStepsExpanded, setToolStepsExpanded] = useState<
    Record<number, boolean>
  >({})
  const [toolStepsCollapsed, setToolStepsCollapsed] = useState(true)

  // Inject keyframe animations once
  useEffect(() => {
    const styleId = 'tool-animations'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes toolPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(55, 114, 255, 0.3), 0 0 40px rgba(138, 43, 226, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(55, 114, 255, 0.5), 0 0 60px rgba(138, 43, 226, 0.4);
          }
        }
        @keyframes toolPulseDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Initialize all tool steps as expanded by default when assistant.toolSteps changes
  useEffect(() => {
    if (assistant?.toolSteps) {
      const initial: Record<number, boolean> = {}
      assistant.toolSteps.forEach((_, idx) => {
        initial[idx] = false
      })
      setToolStepsExpanded(initial)
    }
  }, [assistant?.toolSteps])

  const handleToggleToolStep = (idx: number) => {
    setToolStepsExpanded((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  // Check if all tool steps are finished
  const allToolsFinished =
    assistant?.toolSteps?.every((step) => step.finished) ?? true

  // Find the currently running tool (first one that's not finished)
  const runningToolIndex = assistant?.toolSteps?.findIndex(
    (step) => !step.finished,
  )

  return (
    <Box
      px="md"
      py={10}
      style={{
        backgroundColor: 'rgba(246,248,252,1)',
        borderRadius: 10,
        border: '1px solid #E3E7ED',
        marginBottom: 0,
      }}
    >
      <Stack gap={4}>
        {/* User Query */}
        <Box mb={4}>
          <Group gap={8} mb={2} align="center">
            <Avatar size={22} radius="xl" color="blue" variant="filled">
              <IconUser size={14} />
            </Avatar>
            <Text size="sm" fw={600} c="blue.7">
              You
            </Text>
          </Group>
          <Text
            size="sm"
            style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
            pl={36}
            c="gray.7"
          >
            {user.content}
          </Text>
        </Box>

        {/* Assistant Response */}
        {assistant && (
          <>
            <Divider my={4} style={{ borderColor: '#ECF1F7' }} />
            <Box>
              <Group gap={8} mb={2} align="center">
                <Avatar size={22} radius="xl" color="violet" variant="filled">
                  <IconSparkles size={14} />
                </Avatar>
                <Text size="sm" fw={600} c="violet.7">
                  Agent
                </Text>
              </Group>
              <Text
                size="sm"
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                pl={36}
                c="gray.8"
              >
                <CustomMarkdown>{assistant.content}</CustomMarkdown>
              </Text>

              {/* Tool Steps */}
              {assistant.toolSteps && assistant.toolSteps.length > 0 && (
                <Box mt={10} pl={36}>
                  {allToolsFinished ? (
                    // Show collapsible sections when all tools are finished
                    <>
                      <Group
                        gap={6}
                        mb={4}
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          setToolStepsCollapsed(!toolStepsCollapsed)
                        }
                      >
                        <ActionIcon size="xs" variant="subtle" color="blue">
                          {toolStepsCollapsed ? (
                            <IconChevronDown size={14} />
                          ) : (
                            <IconChevronUp size={14} />
                          )}
                        </ActionIcon>
                        <IconCode size={15} style={{ color: '#3772FF' }} />
                        <Text size="xs" c="blue.6" fw={600}>
                          Tool Usage ({assistant.toolSteps.length})
                        </Text>
                      </Group>
                      <Collapse in={!toolStepsCollapsed}>
                        <Stack gap={6}>
                          {assistant.toolSteps.map((step, idx) => (
                            <Box
                              key={idx}
                              p={7}
                              style={{
                                backgroundColor: '#F5F8FE',
                                borderRadius: 7,
                                border: '1px solid #E3E7ED',
                              }}
                            >
                              <Group
                                gap={7}
                                align="center"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleToggleToolStep(idx)}
                              >
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color="blue"
                                >
                                  {toolStepsExpanded[idx] ? (
                                    <IconChevronUp size={14} />
                                  ) : (
                                    <IconChevronDown size={14} />
                                  )}
                                </ActionIcon>
                                <Text size="xs" fw={600} c="blue.6" mb={3}>
                                  {step.tool}
                                </Text>
                              </Group>
                              <Collapse
                                in={toolStepsExpanded[idx]}
                                transitionDuration={120}
                              >
                                {step.args && (
                                  <Box mb={4} mt={2}>
                                    <Text size="xs" c="dimmed" fw={500} mb={2}>
                                      Args:
                                    </Text>
                                    <Box
                                      component="pre"
                                      style={{
                                        background: 'rgba(0,0,0,0.03)',
                                        borderRadius: 6,
                                        padding: 8,
                                        fontSize: 12,
                                        fontFamily:
                                          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        margin: 0,
                                      }}
                                    >
                                      {JSON.stringify(step.args, null, 2)}
                                    </Box>
                                  </Box>
                                )}
                                {step.result && (
                                  <Box mt={2}>
                                    <Text size="xs" c="dimmed" fw={500} mb={2}>
                                      Result:
                                    </Text>
                                    <Box
                                      component="pre"
                                      style={{
                                        background: 'rgba(0,0,0,0.03)',
                                        borderRadius: 6,
                                        padding: 8,
                                        fontSize: 12,
                                        fontFamily:
                                          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        margin: 0,
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                      }}
                                    >
                                      {JSON.stringify(step.result, null, 2)}
                                    </Box>
                                  </Box>
                                )}
                              </Collapse>
                            </Box>
                          ))}
                        </Stack>
                      </Collapse>
                    </>
                  ) : (
                    // Show running tool with glowing gradient when tools are in progress
                    <Stack gap={6}>
                      {runningToolIndex !== undefined &&
                        runningToolIndex >= 0 && (
                          <Box
                            p={10}
                            style={{
                              background:
                                'linear-gradient(135deg, rgba(55, 114, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%)',
                              borderRadius: 8,
                              border: '2px solid rgba(55, 114, 255, 0.3)',
                              boxShadow:
                                '0 0 20px rgba(55, 114, 255, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)',
                              animation: 'toolPulse 2s ease-in-out infinite',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <Group gap={8} align="center">
                              <Box
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background:
                                    'linear-gradient(135deg, #3772FF 0%, #8A2BE2 100%)',
                                  animation:
                                    'toolPulseDot 1.5s ease-in-out infinite',
                                }}
                              />
                              <Text size="xs" fw={600} c="blue.7">
                                Running:{' '}
                                {assistant.toolSteps[runningToolIndex].tool}
                              </Text>
                            </Group>
                            {assistant.toolSteps[runningToolIndex].args && (
                              <Box mt={6}>
                                <Text size="xs" c="dimmed" fw={500} mb={2}>
                                  Args:
                                </Text>
                                <Box
                                  component="pre"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.5)',
                                    borderRadius: 6,
                                    padding: 8,
                                    fontSize: 11,
                                    fontFamily:
                                      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    margin: 0,
                                  }}
                                >
                                  {JSON.stringify(
                                    assistant.toolSteps[runningToolIndex].args,
                                    null,
                                    2,
                                  )}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}
                      {/* Show completed tools (if any) */}
                      {assistant.toolSteps
                        .map((step, idx) => ({ step, idx }))
                        .filter(({ step }) => step.finished)
                        .map(({ step, idx }) => (
                          <Box
                            key={idx}
                            p={7}
                            style={{
                              backgroundColor: '#F5F8FE',
                              borderRadius: 7,
                              border: '1px solid #E3E7ED',
                              opacity: 0.7,
                            }}
                          >
                            <Group gap={7} align="center">
                              <Text size="xs" fw={500} c="gray.6">
                                ✓ {step.tool}
                              </Text>
                            </Group>
                          </Box>
                        ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* Collapsible Commands */}
              {assistant.commands && assistant.commands.length > 0 && (
                <Box mt={10} pl={36}>
                  <Group
                    gap={6}
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
                    <Group gap={4} align="center">
                      <IconCode size={13} style={{ color: '#ABB4C6' }} />
                      <Text size="xs" c="gray.7" fw={600}>
                        SQL Commands ({assistant.commands.length})
                      </Text>
                    </Group>
                  </Group>
                  <Collapse in={commandsExpanded}>
                    <Box
                      mt={8}
                      p={7}
                      style={{
                        backgroundColor: '#F7FAFB',
                        borderRadius: 6,
                        border: '1px solid #E3E7ED',
                        maxHeight: '174px',
                        overflowY: 'auto',
                      }}
                    >
                      <Stack gap={5}>
                        {assistant.commands.map((cmd, idx) => (
                          <Box
                            key={idx}
                            p={7}
                            style={{
                              backgroundColor: '#FFF',
                              borderRadius: 6,
                              border: '1px solid #F0F0F1',
                            }}
                          >
                            <Group gap={7} align="flex-start">
                              <Badge
                                size="xs"
                                variant="dot"
                                color="gray"
                                style={{
                                  minWidth: 20,
                                  textAlign: 'center',
                                  fontSize: 10,
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
                                c="gray.7"
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
  threads?: AgentThreadSummary[]
  selectedThreadId?: string
  onThreadSelect?: (threadId?: string) => void
  onCreateThread?: () => void
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
  threads = [],
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  messages = [],
  commandQueue = [],
  currentCommandIndex = 0,
  mode = 'query',
  onModeChange,
}: AgentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const [queueExpanded, setQueueExpanded] = useState(false)

  const remainingCommands = commandQueue.slice(currentCommandIndex + 1)

  // Scroll to bottom after a new message is added or on send
  useEffect(() => {
    if (scrollViewportRef.current) {
      requestAnimationFrame(() => {
        scrollViewportRef.current!.scrollTo({
          top: scrollViewportRef.current!.scrollHeight,
          behavior: 'smooth',
        })
      })
    }
  }, [messages.length])

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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 'var(--mantine-radius-md)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        minWidth: 0,
        minHeight: 0,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      <Stack
        gap={0}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <Box
          px={18}
          py={11}
          style={{
            borderBottom: '1px solid #E3E7ED',
            background: 'white',
            position: 'sticky',
            top: 0,
            zIndex: 2,
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <Stack gap={4}>
            <Group justify="space-between" align="center" mb={1}>
              <Group gap={8}>
                <IconSparkles size={19} style={{ color: '#3772FF' }} />
                <Text fw={600} size="md" style={{ letterSpacing: -0.5 }}>
                  AI Agent
                </Text>
                {commandQueue.length > 0 && (
                  <Badge
                    size="sm"
                    variant="light"
                    color="blue"
                    style={{
                      fontWeight: 500,
                      background: '#F5F8FE',
                      border: 0,
                    }}
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
                    <IconChevronUp size={18} />
                  ) : (
                    <IconChevronDown size={18} />
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
                styles={{
                  root: { maxWidth: 320, marginTop: 3 },
                  label: { fontWeight: 500, fontSize: 13 },
                }}
              />
            )}
            {(threads.length > 0 || onCreateThread) && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <Select
                  size="sm"
                  placeholder={
                    threads.length > 0
                      ? 'Select a conversation'
                      : 'No saved conversations'
                  }
                  data={threads.map((thread) => ({
                    value: thread.agentThreadId,
                    label:
                      thread.title?.slice(0, 20) + '...' ||
                      'Untitled conversation',
                  }))}
                  value={selectedThreadId ?? null}
                  onChange={(value) => {
                    if (!onThreadSelect) return
                    if (value) {
                      onThreadSelect(value)
                    } else {
                      onThreadSelect(undefined)
                    }
                  }}
                  w="100%"
                  clearable
                  allowDeselect
                  disabled={threads.length === 0}
                  nothingFoundMessage="No conversations"
                  styles={{
                    input: { fontSize: 13 },
                    dropdown: { fontSize: 13 },
                  }}
                />
                {onCreateThread && (
                  <Button size="xs" variant="light" onClick={onCreateThread}>
                    <IconPlus size={16} />
                  </Button>
                )}
              </div>
            )}
          </Stack>
        </Box>

        {/* Command Queue Status */}
        {remainingCommands.length > 0 && (
          <Box px={18} pt={7}>
            <Collapse in={queueExpanded}>
              <Box
                p={9}
                style={{
                  backgroundColor: '#F5F8FE',
                  borderRadius: 8,
                  border: '1px solid #E3E7ED',
                  maxHeight: '100px',
                  overflowY: 'auto',
                }}
              >
                <Group gap={7} mb={3}>
                  <IconCode size={13} style={{ color: '#3772FF' }} />
                  <Text size="xs" fw={600} c="blue.7">
                    Remaining ({remainingCommands.length})
                  </Text>
                </Group>
                <Stack gap={3}>
                  {remainingCommands.map((cmd, idx) => {
                    const actualIndex = currentCommandIndex + 1 + idx
                    return (
                      <Box
                        key={idx}
                        p={8}
                        style={{
                          backgroundColor: '#FFF',
                          borderRadius: 5,
                          border: '1px solid #E3E7ED',
                        }}
                      >
                        <Group gap={6} align="flex-start">
                          <Badge
                            size="xs"
                            variant="dot"
                            color="gray"
                            style={{
                              minWidth: 20,
                              textAlign: 'center',
                              fontSize: 10,
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
                            c="gray.7"
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
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            maxHeight: '100%',
            maxWidth: '100vw',
            background: 'none',
            paddingLeft: 0,
            paddingRight: 0,
          }}
          p={0}
          type="auto"
          offsetScrollbars
          viewportRef={scrollViewportRef}
        >
          <Stack gap={13} px={18} py={14}>
            {messages.length === 0 && !description && (
              <Box
                py="lg"
                style={{
                  textAlign: 'center',
                  color: '#AAB4C6',
                }}
              >
                <IconSparkles
                  size={30}
                  style={{
                    color: '#E4EAF5',
                    marginBottom: 8,
                    margin: '0 auto 8px',
                  }}
                />
                <Text size="sm" c="gray.5">
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
                p={10}
                style={{
                  backgroundColor: '#F2F8FF',
                  borderRadius: 8,
                  border: '1px solid #D5E3FF',
                  boxShadow: '0 1px 4px 0 #e6eefd',
                }}
              >
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
                  {description}
                </Text>
              </Box>
            )}
          </Stack>
        </ScrollArea>

        {!!error && (
          <Box px={18} pt={8}>
            <Alert
              color="red"
              title="Error"
              onClose={onErrorClose}
              withCloseButton
              variant="light"
              styles={{
                root: {
                  backgroundColor: '#FEEBEB',
                  border: '1px solid #F9CFCF',
                },
              }}
            >
              <Text size="xs">{error}</Text>
            </Alert>
          </Box>
        )}

        <Divider style={{ borderColor: '#E3E7ED', margin: 0 }} />

        {/* Input Area */}
        <Box
          px={18}
          py={10}
          style={{
            borderTop: '1px solid #E3E7ED',
            background: 'white',
            minHeight: 0,
          }}
        >
          <Stack gap={7}>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.currentTarget.value)}
              placeholder="Ask the agent to help with your query..."
              styles={{
                input: {
                  fontSize: '13px',
                  lineHeight: 1.5,
                  padding: '10px 13px',
                  backgroundColor: '#F6F7FA',
                  border: '1px solid #E3E7ED',
                  borderRadius: '9px',
                  minHeight: '53px',
                  maxHeight: '180px',
                  resize: 'none',
                  overflow: 'auto',
                  boxShadow: 'none',
                  '&:focus': {
                    borderColor: '#3772FF',
                    backgroundColor: '#fff',
                  },
                  transition: 'border-color 0.18s, background 0.20s',
                },
              }}
            />
            <Group justify="space-between" align="center">
              <Text size="xs" c="gray.6">
                Ctrl+Enter to send
              </Text>
              <Button
                leftSection={<IconPlayerPlay size={14} />}
                onClick={onExecute}
                loading={isExecuting}
                disabled={!input.trim()}
                size="xs"
                variant="filled"
                style={{
                  borderRadius: 6,
                  boxShadow: '0 1px 4px 0 #E3E7ED',
                  fontWeight: 600,
                  fontSize: 13,
                }}
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
