import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Paper, Text, ActionIcon, Group, Stack } from '@mantine/core'
import { IconX, IconGripVertical } from '@tabler/icons-react'
import {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  DonutChart,
} from '@mantine/charts'
import '@mantine/charts/styles.css'

/**
 * New drag & drop implementation using Pointer Events and a canvas-relative
 * coordinate system. Each chart calculates its position relative to the
 * canvas bounding rect (from getBoundingClientRect) so dragging works
 * reliably regardless of scroll/viewport offsets.
 *
 * Implementation notes:
 * - Pointer events are used so touch + mouse work the same.
 * - On pointerdown we capture the canvas rect and pointer offset and then
 *   listen to window pointermove/pointerup for robust dragging.
 * - Positions are constrained to the measured canvas size.
 */

interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'donut'
  title: string
  data: any[]
  dataKey: string
  xAxisKey: string
  yAxisKey: string
  series?: Array<{ name: string; color: string }>
  columns?: Array<{ name: string; type: string }>
  query?: string
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

const CHART_WIDTH = 480
const CHART_HEIGHT = 370 // chart + header/padding

function DraggableChart({
  chart,
  onRemove,
  onMove,
  canvasRef,
}: {
  chart: ChartItem
  onRemove?: () => void
  onMove?: (position: { x: number; y: number }) => void
  canvasRef: React.RefObject<HTMLDivElement>
}) {
  const [position, setPosition] = useState(chart.position)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // drag state refs so handlers don't reattach on every render
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const canvasRectRef = useRef<DOMRect | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    setPosition(chart.position)
  }, [chart.position])

  // constrain to canvas bounds (taking into account padding/margins)
  // When the canvas is smaller than the chart we allow negative positions so the
  // user can still drag the chart and access its edges. The valid range is
  // [contentSize - chartSize, 0].
  const constrainPosition = (pos: { x: number; y: number }) => {
    const canvasRect = canvasRectRef.current
    if (!canvasRect) {
      // fallback to no constraint
      return pos
    }

    // canvas content area width/height we allow charts to occupy.
    const contentWidth = Math.max(0, canvasRect.width - 40) // same padding convention
    const contentHeight = Math.max(0, canvasRect.height - 40)

    // allow negative min when content is smaller than the chart
    const minX = Math.min(0, contentWidth - CHART_WIDTH)
    const minY = Math.min(0, contentHeight - CHART_HEIGHT)
    const maxX = Math.max(0, contentWidth - CHART_WIDTH)
    const maxY = Math.max(0, contentHeight - CHART_HEIGHT)

    return {
      x: Math.max(minX, Math.min(maxX, Math.round(pos.x))),
      y: Math.max(minY, Math.min(maxY, Math.round(pos.y))),
    }
  }

  // Start dragging only when header/drag handle is pressed
  const handlePointerDown = (e: React.PointerEvent) => {
    // only start drag when clicking on drag handle or header
    const target = e.target as HTMLElement
    if (
      !target.closest('[data-drag-handle]') &&
      !target.closest('[data-chart-header]')
    ) {
      return
    }

    // avoid starting drag when clicking interactive controls (buttons)
    if (target.closest('button') && !target.closest('[data-drag-handle]')) {
      return
    }

    // ensure pointer events are captured
    // (we'll rely on window listeners, pointer capture isn't strictly necessary here)
    pointerIdRef.current = e.pointerId

    // read canvas rect at the moment drag starts
    const canvasEl = canvasRef.current
    const canvasRect = canvasEl?.getBoundingClientRect() ?? null
    canvasRectRef.current = canvasRect

    // Calculate offset of pointer inside the chart relative to canvas top-left:
    // pointerClient - canvasLeft - currentChartPosition = pointer offset inside chart
    const canvasLeft = canvasRect?.left ?? 0
    const canvasTop = canvasRect?.top ?? 0

    dragOffsetRef.current = {
      x: e.clientX - canvasLeft - position.x,
      y: e.clientY - canvasTop - position.y,
    }

    setIsDragging(true)
    // Attach window-level handlers for smooth dragging across the screen
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    // prevent text selection / native gestures
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  // pointermove handler as a plain function (attached to window)
  const handlePointerMove = (e: PointerEvent) => {
    // ignore moves from other pointers
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return
    }

    const canvasRect = canvasRectRef.current
    const offset = dragOffsetRef.current
    if (!canvasRect || !offset) return

    const localX = e.clientX - canvasRect.left - offset.x
    const localY = e.clientY - canvasRect.top - offset.y

    const newPos = constrainPosition({ x: localX, y: localY })
    setPosition(newPos)
    onMove?.(newPos)
  }

  const handlePointerUp = (e: PointerEvent) => {
    // ignore pointerups from other pointers
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return
    }

    // finalize
    const canvasRect = canvasRectRef.current
    const offset = dragOffsetRef.current
    if (canvasRect && offset) {
      const localX = e.clientX - canvasRect.left - offset.x
      const localY = e.clientY - canvasRect.top - offset.y
      const newPos = constrainPosition({ x: localX, y: localY })
      setPosition(newPos)
      onMove?.(newPos)
    }

    // cleanup
    setIsDragging(false)
    dragOffsetRef.current = null
    canvasRectRef.current = null
    pointerIdRef.current = null

    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    // cleanup in case component unmounts during a drag
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderChart = () => {
    const { config } = chart
    const commonProps = {
      data: config.data,
      dataKey: config.dataKey,
      h: 200,
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
            h={200}
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
            h={200}
          />
        )
      }
      case 'scatter':
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
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: CHART_WIDTH,
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: isDragging ? 1000 : isHovered ? 10 : 1,
        userSelect: 'none',
        backgroundColor: 'white',
        border: isHovered ? '1px solid #dee2e6' : '1px solid #e9ecef',
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      p="md"
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
          <Group gap="xs" data-drag-handle style={{ flex: 1 }}>
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
              onPointerDown={(e) => {
                // prevent drag from starting when the remove button is pressed
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
  const [canvasSize, setCanvasSize] = useState({ width: 10, height: 10 })

  // Measure the canvas size and update on changes
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect
        setCanvasSize({
          width: Math.max(0, rect.width - 40),
          height: Math.max(0, rect.height - 40),
        })
      }
    })
    ro.observe(el)

    // initial measure
    const r = el.getBoundingClientRect()
    setCanvasSize({
      width: Math.max(0, r.width - 40),
      height: Math.max(0, r.height - 40),
    })

    return () => ro.disconnect()
  }, [])

  // When the canvas size changes, ensure chart positions remain within bounds.
  useEffect(() => {
    if (!canvasRef.current) return
    if (canvasSize.width === 0 || canvasSize.height === 0) return

    const maxX = Math.max(0, canvasSize.width - CHART_WIDTH)
    const maxY = Math.max(0, canvasSize.height - CHART_HEIGHT)

    charts.forEach((c) => {
      const constrainedX = Math.max(0, Math.min(maxX, c.position.x))
      const constrainedY = Math.max(0, Math.min(maxY, c.position.y))
      if (constrainedX !== c.position.x || constrainedY !== c.position.y) {
        onChartMove?.(c.id, { x: constrainedX, y: constrainedY })
      }
    })
    // only depends on canvasSize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize])

  const canvasHeight = useMemo(() => {
    if (charts.length === 0) return 400
    const maxY = Math.max(...charts.map((c) => c.position.y), 0)
    return Math.max(400, maxY + CHART_HEIGHT + 60)
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
        overflow: 'hidden',
      }}
    >
      {canvasSize.width <= 0 || canvasSize.height <= 0 ? (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: `${canvasHeight}px`,
          }}
        >
          <Text c="dimmed" size="sm">
            Measuring container...
          </Text>
        </Box>
      ) : (
        charts.map((chart) => (
          <DraggableChart
            key={chart.id}
            chart={chart}
            onRemove={() => onRemoveChart?.(chart.id)}
            onMove={(pos) => onChartMove?.(chart.id, pos)}
            canvasRef={canvasRef as React.RefObject<HTMLDivElement>}
          />
        ))
      )}
    </Box>
  )
}

export type { ChartConfig, ChartItem }
