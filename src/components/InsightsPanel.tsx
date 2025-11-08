import {
  Box,
  Stack,
  Text,
  Badge,
  Group,
  ScrollArea,
  ActionIcon,
  Collapse,
  Tooltip,
} from '@mantine/core'
import {
  IconBrain,
  IconTrendingUp,
  IconAlertTriangle,
  IconChartBar,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconX,
} from '@tabler/icons-react'
import { useState } from 'react'

export interface Insight {
  title: string
  description: string
  type: 'outlier' | 'trend' | 'aggregation' | 'pattern' | 'anomaly'
  severity: 'low' | 'medium' | 'high'
}

interface InsightsPanelProps {
  insights: Insight[]
  isLoading?: boolean
  onRefresh?: () => void
  onDismiss?: () => void
  error?: string | null
}

function getInsightIcon(type: Insight['type']) {
  switch (type) {
    case 'outlier':
    case 'anomaly':
      return <IconAlertTriangle size={16} />
    case 'trend':
      return <IconTrendingUp size={16} />
    case 'aggregation':
      return <IconChartBar size={16} />
    default:
      return <IconBrain size={16} />
  }
}

function getSeverityColor(severity: Insight['severity']) {
  switch (severity) {
    case 'high':
      return 'red'
    case 'medium':
      return 'orange'
    case 'low':
      return 'blue'
  }
}

// Insight card with improved readable/explodeable description for overflow
function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Box
      p="sm"
      mb={2}
      style={{
        background: 'rgba(255,255,255,0.87)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 'var(--mantine-radius-md)',
        border: `1px solid ${
          insight.severity === 'high'
            ? 'rgba(239, 68, 68, 0.36)'
            : insight.severity === 'medium'
              ? 'rgba(251, 146, 60, 0.35)'
              : 'rgba(59, 130, 246, 0.26)'
        }`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'box-shadow .16s,transform .1s',
        minWidth: 0,
      }}
      onClick={() => setExpanded((v) => !v)}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.13)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      <Stack gap="xs">
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          style={{ minWidth: 0 }}
        >
          <Group gap="xs" style={{ flex: 1, minWidth: 0 }} align="flex-start">
            <Box
              style={{
                color: `var(--mantine-color-${getSeverityColor(insight.severity)}-6)`,
                marginTop: 2,
              }}
            >
              {getInsightIcon(insight.type)}
            </Box>
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Box
                style={{
                  display: 'flex',
                  alignItems: '',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  size="sm"
                  fw={600}
                  style={{
                    lineHeight: 1.4,
                    color: 'var(--mantine-color-gray-9)',
                    overflow: 'hidden',

                    maxWidth: '100%',
                  }}
                  title={insight.title}
                >
                  {insight.title}
                </Text>
                <div>
                  <Badge
                    size="xs"
                    variant="dot"
                    color={getSeverityColor(insight.severity)}
                    style={{
                      textTransform: 'capitalize',
                      fontWeight: 500,
                    }}
                  >
                    {insight.severity}
                  </Badge>
                  <Badge
                    size="xs"
                    variant="light"
                    color="indigo"
                    style={{
                      textTransform: 'capitalize',
                      fontWeight: 500,
                    }}
                  >
                    {insight.type}
                  </Badge>
                </div>
              </Box>
              <Box
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  width: '100%',
                }}
              >
                <Text
                  component="span"
                  size="xs"
                  c="dimmed"
                  style={{
                    lineHeight: 1.5,
                    overflow: expanded ? undefined : 'hidden',
                    textOverflow: expanded ? 'unset' : 'ellipsis',
                    whiteSpace: expanded ? 'pre-wrap' : 'nowrap',
                    maxWidth: expanded ? '100%' : 280,
                    transition: 'all .15s',
                    cursor: 'pointer',
                  }}
                  title={expanded ? undefined : insight.description}
                >
                  {insight.description}
                </Text>
                {insight.description.length > 88 && (
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    mt={-1}
                    ml={4}
                    tabIndex={-1}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpanded((v) => !v)
                    }}
                  >
                    {expanded ? (
                      <IconChevronUp size={14} />
                    ) : (
                      <IconChevronDown size={14} />
                    )}
                  </ActionIcon>
                )}
              </Box>
            </Stack>
          </Group>
        </Group>
      </Stack>
    </Box>
  )
}

export function InsightsPanel({
  insights,
  isLoading = false,
  onRefresh,
  onDismiss,
  error,
}: InsightsPanelProps) {
  const [expanded, setExpanded] = useState(true)

  // Panel should be as tall as possible in its section, minimize hidden overflow.
  // Header is sticky so scrolling works for big lists.
  return (
    <Box
      p={0}
      style={{
        width: '100%',
        minWidth: 320,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.84)',
        backdropFilter: 'blur(18px) saturate(150%)',
        WebkitBackdropFilter: 'blur(18px) saturate(150%)',
        border: '1px solid rgba(0,0,0,.18)',
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-lg)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      <Stack
        gap={0}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Header */}
        <Box
          p="md"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.22)',
            backgroundColor: 'rgba(255,255,255,0.46)',
            backdropFilter: 'blur(9px)',
            WebkitBackdropFilter: 'blur(9px)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <IconBrain
                size={20}
                style={{ color: 'var(--mantine-color-violet-6)' }}
              />
              <Text fw={600} size="sm">
                Insights
              </Text>
              {insights.length > 0 && (
                <Badge
                  size="xs"
                  variant="light"
                  color="violet"
                  style={{ fontWeight: 500 }}
                >
                  {insights.length}
                </Badge>
              )}
            </Group>
            <Group gap="xs" wrap="nowrap">
              {onRefresh && (
                <Tooltip label="Refresh insights">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRefresh()
                    }}
                    loading={isLoading}
                  >
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              {onDismiss && (
                <Tooltip label="Dismiss">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDismiss()
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
              >
                {expanded ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )}
              </ActionIcon>
            </Group>
          </Group>
        </Box>
        {/* Content */}
        <Collapse
          in={expanded}
          transitionDuration={120}
          style={{ minHeight: 0, flex: 1 }}
        >
          <ScrollArea
            style={{
              flex: 1,
              minHeight: 0,
              maxHeight: 'calc(100vh - 200px)',
              padding: '0',
            }}
            p={0}
            type="auto"
            offsetScrollbars
            scrollbarSize={8}
            scrollHideDelay={300}
            w="100%"
          >
            <Box
              py="md"
              px="md"
              style={{ minHeight: 0, overflow: 'scroll !important' }}
            >
              {isLoading ? (
                <Box p="lg" style={{ textAlign: 'center' }}>
                  <Text size="sm" c="dimmed">
                    Analyzing data...
                  </Text>
                </Box>
              ) : error ? (
                <Box
                  p="sm"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    borderRadius: 'var(--mantine-radius-sm)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <Text size="xs" c="red">
                    {error}
                  </Text>
                </Box>
              ) : insights.length === 0 ? (
                <Box p="lg" style={{ textAlign: 'center' }}>
                  <IconBrain
                    size={32}
                    style={{
                      color: 'var(--mantine-color-gray-4)',
                      margin: '0 auto 8px',
                      display: 'block',
                    }}
                  />
                  <Text size="sm" c="dimmed">
                    No insights available
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Run a query to generate insights
                  </Text>
                </Box>
              ) : (
                <Stack gap="sm" style={{ overflow: 'scroll !important' }}>
                  {insights.map((insight, idx) => (
                    <InsightCard key={idx} insight={insight} />
                  ))}
                </Stack>
              )}
            </Box>
          </ScrollArea>
        </Collapse>
      </Stack>
    </Box>
  )
}
