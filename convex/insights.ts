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
  columnCount: number,
  rowCount: number,
): string {
  const dataSignature = `${tableName}|${query}|${columnCount}|${rowCount}`
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

// Statistical analysis results from DuckDB queries
// These types represent the results returned from DuckDB statistical queries
// The types are defined in the frontend duckdbAnalytics.ts file

export const generateInsights = action({
  args: {
    tableName: v.string(),
    query: v.string(),
    statisticalAnalyses: v.array(
      v.object({
        columnName: v.string(),
        columnType: v.string(),
        hasNumericData: v.boolean(),
        stats: v.optional(
          v.object({
            mean: v.number(),
            median: v.number(),
            stdDev: v.number(),
            min: v.number(),
            max: v.number(),
            q1: v.number(),
            q3: v.number(),
            iqr: v.number(),
            count: v.number(),
          }),
        ),
        outliers: v.optional(
          v.array(
            v.object({
              value: v.number(),
              zScore: v.number(),
            }),
          ),
        ),
        topPerformers: v.optional(
          v.array(
            v.object({
              value: v.number(),
            }),
          ),
        ),
        bottomPerformers: v.optional(
          v.array(
            v.object({
              value: v.number(),
            }),
          ),
        ),
        timeTrend: v.optional(
          v.object({
            trend: v.union(
              v.literal('increasing'),
              v.literal('decreasing'),
              v.literal('stable'),
            ),
            avgChangePercent: v.number(),
            totalChangePercent: v.number(),
          }),
        ),
      }),
    ),
    rowCount: v.number(),
    columnCount: v.number(),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      tableName,
      query,
      statisticalAnalyses,
      rowCount,
      columnCount,
      forceRefresh,
    },
  ) => {
    await checkAuth(ctx)

    if (!statisticalAnalyses || statisticalAnalyses.length === 0) {
      return {
        insights: [],
        statisticalFindings: [],
        error: 'No numeric data to analyze',
        cached: false,
      }
    }

    const queryStr = query || 'SELECT * FROM table'
    const cacheKey = generateCacheKey(
      tableName,
      queryStr,
      columnCount,
      rowCount,
    )

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

    // Filter to only numeric columns with data
    const analyses = statisticalAnalyses.filter(
      (analysis) => analysis.hasNumericData,
    )

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
- Table: ${tableName}
- Query: ${queryStr}
- Rows analyzed: ${rowCount}
- Columns analyzed: ${analyses.length} numeric columns

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

      console.log('INSIGHTS Context', context)

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
          tableName: tableName,
          query: queryStr,
          dataHash: cacheKey, // Use cacheKey as dataHash for simplicity
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
          tableName: tableName,
          query: queryStr,
          dataHash: cacheKey,
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
