import { Box, SegmentedControl, Group, Text, Badge } from '@mantine/core'
import { IconBrain, IconSparkles, IconHistory } from '@tabler/icons-react'
import { AgentEditor } from './AgentEditor'
import { InsightsPanel, type Insight } from './InsightsPanel'
import { QueryTimeline } from './QueryTimeline'

interface TableSidebarProps {
  activePanel: 'agent' | 'insights' | 'history'
  onPanelChange: (panel: 'agent' | 'insights' | 'history') => void
  tableName: string
  onRollbackComplete?: () => void
  insights: Insight[]
  // Agent props
  agentInput: string
  onAgentInputChange: (input: string) => void
  onAgentExecute: () => Promise<void>
  agentError: string | null
  onAgentErrorClose: () => void
  isAgentExecuting: boolean
  agentDescription: string | undefined
  threads?: Array<{
    agentThreadId: string
    title?: string | null
    lastMessageSummary?: string | null
    lastMessageAt: number
    lastMode?: 'query' | 'analysis'
    agentName?: string | null
  }>
  selectedThreadId?: string
  onThreadSelect?: (threadId?: string) => void
  onCreateThread?: () => void
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    description?: string
    commands?: string[]
    toolSteps?: Array<{ tool: string; args: any; result?: any }>
    mode?: 'query' | 'analysis'
    agentName?: string
    createdAt?: number
  }>
  commandQueue: string[]
  currentCommandIndex: number
  agentMode?: 'query' | 'analysis'
  onAgentModeChange?: (mode: 'query' | 'analysis') => void
  // Insights props
  isGeneratingInsights: boolean
  onGenerateInsights: () => void
  onRefreshInsights: () => void
  onDismissInsights: () => void
  insightsError: string | null
  hasData: boolean
}

export function TableSidebar({
  activePanel,
  onPanelChange,
  tableName,
  onRollbackComplete,
  insights,
  agentInput,
  onAgentInputChange,
  onAgentExecute,
  agentError,
  onAgentErrorClose,
  isAgentExecuting,
  agentDescription,
  threads = [],
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  messages,
  commandQueue,
  currentCommandIndex,
  agentMode,
  onAgentModeChange,
  isGeneratingInsights,
  onGenerateInsights,
  onRefreshInsights,
  onDismissInsights,
  insightsError,
  hasData,
}: TableSidebarProps) {
  return (
    <Box
      style={{
        position: 'fixed',
        right: 15,
        top: 10,
        bottom: 0,
        width: 400,
        zIndex: 200,
        padding: '16px',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        gap: '12px',
      }}
    >
      {/* Toggle Header */}
      <Box
        p="xs"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 'var(--mantine-radius-md)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
      >
        <SegmentedControl
          value={activePanel}
          onChange={(value) =>
            onPanelChange(value as 'agent' | 'insights' | 'history')
          }
          data={[
            {
              value: 'agent',
              label: (
                <Group gap={6} style={{ justifyContent: 'center' }}>
                  <IconSparkles size={16} />
                  <Text size="xs" fw={500}>
                    Agent
                  </Text>
                </Group>
              ),
            },
            {
              value: 'insights',
              label: (
                <Group gap={6} style={{ justifyContent: 'center' }}>
                  <IconBrain size={16} />
                  <Text size="xs" fw={500}>
                    Insights
                  </Text>
                  {insights.length > 0 && (
                    <Badge
                      size="xs"
                      variant="filled"
                      color="violet"
                      style={{ minWidth: 18, height: 18, padding: '0 4px' }}
                    >
                      {insights.length}
                    </Badge>
                  )}
                </Group>
              ),
            },
            {
              value: 'history',
              label: (
                <Group gap={6} style={{ justifyContent: 'center' }}>
                  <IconHistory size={16} />
                  <Text size="xs" fw={500}>
                    History
                  </Text>
                </Group>
              ),
            },
          ]}
          fullWidth
          size="sm"
        />
      </Box>

      {/* Active Panel Content */}
      <Box style={{ flex: 1, minHeight: 0 }}>
        {activePanel === 'agent' ? (
          <AgentEditor
            input={agentInput}
            onInputChange={onAgentInputChange}
            onExecute={onAgentExecute}
            error={agentError}
            onErrorClose={onAgentErrorClose}
            isExecuting={isAgentExecuting}
            description={agentDescription}
            threads={threads}
            selectedThreadId={selectedThreadId}
            onThreadSelect={onThreadSelect}
            onCreateThread={onCreateThread}
            messages={messages}
            commandQueue={commandQueue}
            currentCommandIndex={currentCommandIndex}
            mode={agentMode}
            onModeChange={onAgentModeChange}
          />
        ) : activePanel === 'insights' ? (
          <InsightsPanel
            insights={insights}
            isLoading={isGeneratingInsights}
            onGenerate={onGenerateInsights}
            onRefresh={onRefreshInsights}
            onDismiss={onDismissInsights}
            error={insightsError}
            hasData={hasData}
          />
        ) : (
          <Box
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 'var(--mantine-radius-md)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <QueryTimeline
              tableName={tableName}
              onRollbackComplete={onRollbackComplete}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
