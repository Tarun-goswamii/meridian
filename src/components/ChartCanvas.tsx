import { useState, useRef, useEffect, useMemo } from 'react'
import { Box, Paper, Text, ActionIcon, Group, Stack } from '@mantine/core'
import { IconX, IconGripVertical } from '@tabler/icons-react'
import {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  DonutChart,
} from '@mantine/charts'

interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'donut'
  title: string
  data: any[]
  dataKey: string
  xAxisKey: string
  yAxisKey: string
  series?: Array<{ name: string; color: string }>
  columns?: Array<{ name: string; type: string }>
  query?: string // Original query used to create the chart
}

interface ChartItem {
  id: string
  config: ChartConfig
  position: { x: number; y: number }
}

interface ChartCanvasProps {
  charts: ChartItem[]
  onRemoveChart?: (id: string) => void
  onChartMove?: (id: string, position: { x: number; y: number }) => void
}

function DraggableChart({
  chart,
  onRemove,
  onMove,
  canvasBounds,
}: {
  chart: ChartItem
  onRemove?: () => void
  onMove?: (position: { x: number; y: number }) => void
  canvasBounds?: { width: number; height: number }
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState(chart.position)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const chartRef = useRef<HTMLDivElement>(null)

  const CHART_WIDTH = 480
  const CHART_HEIGHT = 370 // 300px chart + ~70px header/padding

  useEffect(() => {
    setPosition(chart.position)
  }, [chart.position])

  // Constrain position within canvas bounds
  const constrainPosition = (pos: { x: number; y: number }) => {
    if (!canvasBounds) return pos

    const minX = 0
    const minY = 0
    const maxX = Math.max(0, canvasBounds.width - CHART_WIDTH - 20) // 20px padding
    const maxY = Math.max(0, canvasBounds.height - CHART_HEIGHT - 20)

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('[data-drag-handle]') ||
      target.closest('[data-chart-header]')
    ) {
      if (target.closest('button') && !target.closest('[data-drag-handle]')) {
        return
      }

      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x, // Keep this as offset from current position
        y: e.clientY - position.y,
      })

      e.preventDefault()
      e.stopPropagation()
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = constrainPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
      setPosition(newPosition)
      onMove?.(newPosition)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, onMove, canvasBounds])

  const renderChart = () => {
    const { config } = chart
    const commonProps = {
      data: config.data,
      dataKey: config.dataKey,
      h: 300,
    }

    switch (config.type) {
      case 'bar':
        return (
          <BarChart
            {...commonProps}
            series={
              config.series?.map((s) => ({
                name: s.name,
                color: s.color,
              })) || [{ name: config.yAxisKey, color: 'blue' }]
            }
          />
        )
      case 'line':
        return (
          <LineChart
            {...commonProps}
            series={
              config.series?.map((s) => ({
                name: s.name,
                color: s.color,
              })) || [{ name: config.yAxisKey, color: 'blue' }]
            }
            curveType="linear"
          />
        )
      case 'area':
        return (
          <AreaChart
            {...commonProps}
            series={
              config.series?.map((s) => ({
                name: s.name,
                color: s.color,
              })) || [{ name: config.yAxisKey, color: 'blue' }]
            }
            curveType="linear"
          />
        )
      case 'pie': {
        const colors = [
          'blue',
          'green',
          'red',
          'yellow',
          'purple',
          'orange',
          'cyan',
          'pink',
        ]
        return (
          <PieChart
            data={config.data.map((item: any, idx: number) => ({
              name: String(item[config.xAxisKey] ?? ''),
              value: Number(item[config.yAxisKey] ?? 0),
              color: colors[idx % colors.length],
            }))}
            h={300}
          />
        )
      }
      case 'donut': {
        const colors = [
          'blue',
          'green',
          'red',
          'yellow',
          'purple',
          'orange',
          'cyan',
          'pink',
        ]
        return (
          <DonutChart
            data={config.data.map((item: any, idx: number) => ({
              name: String(item[config.xAxisKey] ?? ''),
              value: Number(item[config.yAxisKey] ?? 0),
              color: colors[idx % colors.length],
            }))}
            h={300}
          />
        )
      }
      case 'scatter':
        // ScatterChart not available in Mantine charts, use LineChart instead
        return (
          <LineChart
            {...commonProps}
            series={[{ name: config.yAxisKey, color: 'blue' }]}
            curveType="linear"
            withDots
          />
        )
      default:
        return <Text>Unsupported chart type: {config.type}</Text>
    }
  }

  return (
    <Paper
      ref={chartRef}
      shadow={isDragging ? 'xl' : isHovered ? 'lg' : 'sm'}
      p="md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: CHART_WIDTH,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 1000 : isHovered ? 10 : 1,
        userSelect: 'none',
        transition: isDragging
          ? 'none'
          : 'box-shadow 0.2s ease, transform 0.1s ease',
        transform: isDragging
          ? 'scale(1.02)'
          : isHovered
            ? 'scale(1.01)'
            : 'scale(1)',
        backgroundColor: 'white',
        border: isHovered ? '1px solid #dee2e6' : '1px solid #e9ecef',
      }}
      onMouseDown={handleMouseDown}
    >
      <Stack gap="xs">
        <Group
          data-chart-header
          justify="space-between"
          align="center"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            padding: '4px 0',
          }}
        >
          <Group gap="xs" data-drag-handle style={{ flex: 1, minWidth: 0 }}>
            <IconGripVertical
              size={16}
              style={{
                color: isHovered ? '#495057' : '#868E96',
                flexShrink: 0,
              }}
            />
            <Text
              size="sm"
              fw={600}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {chart.config.title}
            </Text>
          </Group>
          {onRemove && (
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onRemove()
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              style={{
                flexShrink: 0,
                opacity: isHovered ? 1 : 0.6,
                transition: 'opacity 0.2s ease',
              }}
            >
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>
        <Box
          style={{
            pointerEvents: isDragging ? 'none' : 'auto',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {renderChart()}
        </Box>
      </Stack>
    </Paper>
  )
}

export function ChartCanvas({
  charts,
  onRemoveChart,
  onChartMove,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Calculate canvas size and ensure charts fit
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setCanvasSize({
          width: rect.width - 40, // Account for padding
          height: rect.height - 40,
        })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // Constrain chart positions when canvas size changes (only on resize, not on every chart change)
  const previousCanvasSizeRef = useRef({ width: 0, height: 0 })
  useEffect(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return

    // Only constrain if canvas size actually changed
    if (
      previousCanvasSizeRef.current.width === canvasSize.width &&
      previousCanvasSizeRef.current.height === canvasSize.height
    ) {
      return
    }

    previousCanvasSizeRef.current = canvasSize

    const CHART_WIDTH = 480
    const CHART_HEIGHT = 370

    // Use current charts from state at the time of constraint
    charts.forEach((chart) => {
      const maxX = Math.max(0, canvasSize.width - CHART_WIDTH)
      const maxY = Math.max(0, canvasSize.height - CHART_HEIGHT)

      const constrainedX = Math.max(0, Math.min(maxX, chart.position.x))
      const constrainedY = Math.max(0, Math.min(maxY, chart.position.y))

      if (
        constrainedX !== chart.position.x ||
        constrainedY !== chart.position.y
      ) {
        onChartMove?.(chart.id, { x: constrainedX, y: constrainedY })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize]) // Only depend on canvasSize, charts are captured in closure

  // Calculate the required height based on chart positions
  const canvasHeight = useMemo(() => {
    if (charts.length === 0) {
      return 400 // Default minimum height
    }

    // Find the bottommost chart position
    const maxY = Math.max(...charts.map((chart) => chart.position.y), 0)

    // Chart height (300px) + header (~70px) + padding
    const chartHeight = 370
    const requiredHeight = maxY + chartHeight + 60 // Extra padding at bottom

    // Return at least 400px, or the calculated height
    return Math.max(400, requiredHeight)
  }, [charts])

  if (charts.length === 0) {
    return (
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          backgroundColor: '#f8f9fa',
          border: '1px dashed #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px',
        }}
      >
        <Text c="dimmed" size="sm">
          No charts yet. Create charts using the agent to see them here.
        </Text>
      </Box>
    )
  }

  return (
    <Box
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: `${canvasHeight}px`,
        backgroundColor: '#f8f9fa',
        border: '1px dashed #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '20px',
        overflow: 'hidden', // Prevent charts from going outside
      }}
    >
      {charts.map((chart) => (
        <DraggableChart
          key={chart.id}
          chart={chart}
          onRemove={() => onRemoveChart?.(chart.id)}
          onMove={(position) => onChartMove?.(chart.id, position)}
          canvasBounds={canvasSize}
        />
      ))}
    </Box>
  )
}

export type { ChartConfig, ChartItem }
