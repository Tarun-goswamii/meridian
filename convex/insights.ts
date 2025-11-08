import { action, query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'
import { generateObject } from 'ai'
import { z } from 'zod'
import { model } from './table_agent'
import { getAuthUserId } from '@convex-dev/auth/server'
import { api } from './_generated/api'

// Simple hash function for creating cache keys
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

function generateCacheKey(
  tableName: string,
  query: string,
  columns: Array<{ name: string; type: string }>,
  rowCount: number,
): string {
  const dataSignature = `${tableName}|${query}|${columns.map((c) => `${c.name}:${c.type}`).join(',')}|${rowCount}`
  return simpleHash(dataSignature)
}

// Query to get cached insights
export const getCachedInsights = query({
  args: {
    cacheKey: v.string(),
  },
  handler: async (ctx, { cacheKey }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const cached = await ctx.db
      .query('insightsCache')
      .withIndex('by_cacheKey', (q) => q.eq('cacheKey', cacheKey))
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()

    if (!cached) return null

    // Return cached insights if they exist
    return {
      insights: cached.insights,
      statisticalFindings: cached.statisticalFindings,
      cached: true,
      createdAt: cached.createdAt,
    }
  },
})

// Mutation to store insights in cache
export const cacheInsights = mutation({
  args: {
    cacheKey: v.string(),
    tableName: v.string(),
    query: v.string(),
    dataHash: v.string(),
    insights: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        type: v.string(),
        severity: v.string(),
      }),
    ),
    statisticalFindings: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Check if cache entry already exists
    const existing = await ctx.db
      .query('insightsCache')
      .withIndex('by_cacheKey', (q) => q.eq('cacheKey', args.cacheKey))
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()

    if (existing) {
      // Update existing cache
      await ctx.db.patch(existing._id, {
        insights: args.insights,
        statisticalFindings: args.statisticalFindings,
        createdAt: Date.now(),
      })
      return existing._id
    } else {
      // Create new cache entry
      return await ctx.db.insert('insightsCache', {
        cacheKey: args.cacheKey,
        tableName: args.tableName,
        query: args.query,
        dataHash: args.dataHash,
        insights: args.insights,
        statisticalFindings: args.statisticalFindings,
        createdAt: Date.now(),
        userId,
      })
    }
  },
})

// Statistical analysis functions
function isNumeric(value: any): boolean {
  if (value === null || value === undefined) return false
  const num = Number(value)
  return !isNaN(num) && isFinite(num)
}

function extractNumericValues(
  rows: Record<string, any>[],
  columnName: string,
): number[] {
  return rows
    .map((row) => row[columnName])
    .filter((val) => isNumeric(val))
    .map((val) => Number(val))
}

function calculateStats(values: number[]) {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length
  const stdDev = Math.sqrt(variance)
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1

  return {
    mean,
    median,
    stdDev,
    min,
    max,
    q1,
    q3,
    iqr,
    count: values.length,
  }
}

function detectOutliers(
  values: number[],
  stats: ReturnType<typeof calculateStats>,
) {
  if (!stats || stats.stdDev === 0) return []

  const outliers: Array<{ value: number; index: number; zScore: number }> = []
  const threshold = 2 // 2 standard deviations

  values.forEach((val, idx) => {
    const zScore = Math.abs((val - stats.mean) / stats.stdDev)
    if (zScore > threshold) {
      outliers.push({ value: val, index: idx, zScore })
    }
  })

  return outliers.sort((a, b) => b.zScore - a.zScore).slice(0, 10) // Top 10 outliers
}

function detectTopBottomPerformers(
  rows: Record<string, any>[],
  columnName: string,
  limit: number = 5,
) {
  const numericValues = rows
    .map((row, idx) => ({ value: row[columnName], index: idx }))
    .filter((item) => isNumeric(item.value))
    .map((item) => ({ ...item, value: Number(item.value) }))
    .sort((a, b) => b.value - a.value)

  const top = numericValues.slice(0, limit)
  const bottom = numericValues.slice(-limit).reverse()

  return { top, bottom }
}

function detectTimeTrends(rows: Record<string, any>[], columnName: string) {
  // Simple heuristic: check if column name suggests it's a date/time column
  const timeKeywords = [
    'date',
    'time',
    'timestamp',
    'created',
    'updated',
    'year',
    'month',
    'day',
  ]
  const isTimeColumn = timeKeywords.some((keyword) =>
    columnName.toLowerCase().includes(keyword),
  )

  if (!isTimeColumn || rows.length < 2) return null

  // Try to extract numeric values and see if they form a sequence
  const values = extractNumericValues(rows, columnName)
  if (values.length < 2) return null

  // Calculate percent change
  const changes: number[] = []
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      const change = ((values[i] - values[i - 1]) / values[i - 1]) * 100
      changes.push(change)
    }
  }

  if (changes.length === 0) return null

  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
  const trend =
    avgChange > 5 ? 'increasing' : avgChange < -5 ? 'decreasing' : 'stable'

  return {
    trend,
    avgChangePercent: avgChange,
    totalChangePercent:
      ((values[values.length - 1] - values[0]) / values[0]) * 100,
  }
}

function analyzeColumn(
  rows: Record<string, any>[],
  column: { name: string; type: string },
) {
  const numericValues = extractNumericValues(rows, column.name)

  if (numericValues.length === 0) {
    return {
      columnName: column.name,
      columnType: column.type,
      hasNumericData: false,
    }
  }

  const stats = calculateStats(numericValues)
  if (!stats) {
    return {
      columnName: column.name,
      columnType: column.type,
      hasNumericData: false,
    }
  }

  const outliers = detectOutliers(numericValues, stats)
  const topBottom = detectTopBottomPerformers(rows, column.name)
  const timeTrend = detectTimeTrends(rows, column.name)

  return {
    columnName: column.name,
    columnType: column.type,
    hasNumericData: true,
    stats,
    outliers: outliers.length > 0 ? outliers : undefined,
    topPerformers: topBottom.top.length > 0 ? topBottom.top : undefined,
    bottomPerformers:
      topBottom.bottom.length > 0 ? topBottom.bottom : undefined,
    timeTrend: timeTrend || undefined,
  }
}

export const generateInsights = action({
  args: {
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
      }),
    ),
    rows: v.array(v.any()),
    tableName: v.optional(v.string()),
    query: v.optional(v.string()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, { columns, rows, tableName, query, forceRefresh }) => {
    const userId = await checkAuth(ctx)

    if (!rows || rows.length === 0) {
      return {
        insights: [],
        statisticalFindings: [],
        error: 'No data to analyze',
        cached: false,
      }
    }

    const table = tableName || 'unknown'
    const queryStr = query || 'SELECT * FROM table'
    const dataHash = simpleHash(
      JSON.stringify({ columns, rowCount: rows.length }),
    )
    const cacheKey = generateCacheKey(table, queryStr, columns, rows.length)

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached: any = await ctx.runQuery(api.insights.getCachedInsights, {
        cacheKey,
      })
      if (cached) {
        return {
          ...cached,
          error: null,
        }
      }
    }

    // Analyze each numeric column
    const analyses = columns
      .map((col) => analyzeColumn(rows, col))
      .filter((analysis) => analysis.hasNumericData)

    // Build statistical findings summary
    const findings: string[] = []

    analyses.forEach((analysis) => {
      if (!analysis.stats) return

      const {
        columnName,
        stats,
        outliers,
        topPerformers,
        bottomPerformers,
        timeTrend,
      } = analysis

      // Basic stats
      findings.push(
        `${columnName}: Mean=${stats.mean.toFixed(2)}, Median=${stats.median.toFixed(2)}, StdDev=${stats.stdDev.toFixed(2)}`,
      )

      // Outliers
      if (outliers && outliers.length > 0) {
        findings.push(
          `${columnName}: Found ${outliers.length} outliers (values > 2 std dev from mean)`,
        )
      }

      // Top/Bottom performers
      if (topPerformers && topPerformers.length > 0) {
        findings.push(
          `${columnName}: Top value = ${topPerformers[0].value.toFixed(2)}, Bottom value = ${bottomPerformers?.[0]?.value.toFixed(2) || 'N/A'}`,
        )
      }

      // Time trends
      if (timeTrend) {
        findings.push(
          `${columnName}: ${timeTrend.trend} trend (${timeTrend.avgChangePercent > 0 ? '+' : ''}${timeTrend.avgChangePercent.toFixed(2)}% avg change)`,
        )
      }
    })

    // Generate AI insights
    try {
      const context = `
DATASET ANALYSIS:
- Table: ${tableName || 'Unknown'}
- Query: ${query || 'SELECT * FROM table'}
- Rows analyzed: ${rows.length}
- Columns: ${columns.map((c) => `${c.name} (${c.type})`).join(', ')}

STATISTICAL FINDINGS:
${findings.join('\n')}

DETAILED ANALYSIS:
${JSON.stringify(
  analyses.map((a) => ({
    column: a.columnName,
    stats: a.stats,
    outlierCount: a.outliers?.length || 0,
    hasTopPerformers: !!a.topPerformers,
    timeTrend: a.timeTrend,
  })),
  null,
  2,
)}

Please analyze this dataset and provide 3-5 key insights in plain language. Focus on:
1. Notable patterns or anomalies
2. Significant outliers or extreme values
3. Trends over time (if applicable)
4. Top/bottom performers
5. Any other interesting observations

Keep insights concise (1-2 sentences each) and actionable.
`

      const result = await generateObject({
        model,
        schema: z.object({
          insights: z
            .array(
              z.object({
                title: z.string().describe('Short title for the insight'),
                description: z.string().describe('1-2 sentence explanation'),
                type: z
                  .enum([
                    'outlier',
                    'trend',
                    'aggregation',
                    'pattern',
                    'anomaly',
                  ])
                  .describe('Type of insight'),
                severity: z
                  .enum(['low', 'medium', 'high'])
                  .describe('Importance/severity of the insight'),
              }),
            )
            .min(1)
            .max(5),
        }),
        prompt: context,
      })

      const insightsResult = {
        insights: result.object.insights,
        statisticalFindings: analyses,
        error: null,
        cached: false,
      }

      // Cache the insights
      try {
        await ctx.runMutation(api.insights.cacheInsights, {
          cacheKey,
          tableName: table,
          query: queryStr,
          dataHash,
          insights: result.object.insights,
          statisticalFindings: analyses,
        })
      } catch (cacheError) {
        console.error('Error caching insights:', cacheError)
        // Continue even if caching fails
      }

      return insightsResult
    } catch (error) {
      console.error('Error generating AI insights:', error)
      // Fallback to basic insights
      const fallbackInsights = findings.slice(0, 5).map((finding, idx) => ({
        title: `Finding ${idx + 1}`,
        description: finding,
        type: 'pattern' as const,
        severity: 'medium' as const,
      }))

      // Try to cache fallback insights
      try {
        await ctx.runMutation(api.insights.cacheInsights, {
          cacheKey,
          tableName: table,
          query: queryStr,
          dataHash,
          insights: fallbackInsights,
          statisticalFindings: analyses,
        })
      } catch (cacheError) {
        console.error('Error caching fallback insights:', cacheError)
      }

      return {
        insights: fallbackInsights,
        statisticalFindings: analyses,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate AI insights',
        cached: false,
      }
    }
  },
})
