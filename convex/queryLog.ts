import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { checkAuth } from './authFns'

// Mutation to log a query execution
export const logQuery = mutation({
  args: {
    query: v.string(),
    tableName: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
    resultMetadata: v.optional(
      v.object({
        rowCount: v.optional(v.number()),
        columnCount: v.optional(v.number()),
        executionTimeMs: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await checkAuth(ctx)

    // Get the highest sequence number across all users (global sequence)
    // This ensures queries are ordered globally, not per-user
    const allQueries = await ctx.db.query('queryLog').collect()
    const maxSequence =
      allQueries.length > 0
        ? Math.max(...allQueries.map((q) => q.sequenceNumber))
        : -1

    const sequenceNumber = maxSequence + 1

    return await ctx.db.insert('queryLog', {
      query: args.query,
      tableName: args.tableName,
      executedAt: Date.now(),
      userId,
      success: args.success,
      error: args.error,
      sequenceNumber,
      resultMetadata: args.resultMetadata,
    })
  },
})

// Query to get all query logs for the current user, optionally filtered by table
export const getQueryLogs = query({
  args: {
    tableName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await checkAuth(ctx)

    const limit = args.limit || 1000

    let dbQuery = ctx.db
      .query('queryLog')
      .withIndex('by_userId', (q) => q.eq('userId', userId))

    // Filter by tableName if provided
    if (args.tableName) {
      const tableName = args.tableName
      dbQuery = ctx.db
        .query('queryLog')
        .withIndex('by_userId_tableName', (q) =>
          q.eq('userId', userId).eq('tableName', tableName),
        )
    }

    const logs = await dbQuery.order('desc').take(limit)

    return logs.sort((a, b) => b.sequenceNumber - a.sequenceNumber)
  },
})

// Query to get query logs up to a specific sequence number (for rollback)
// Only returns logs for the specified table to ensure rollback safety
export const getQueryLogsUpTo = query({
  args: {
    tableName: v.string(),
    sequenceNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await checkAuth(ctx)

    const allLogs = await ctx.db
      .query('queryLog')
      .withIndex('by_userId_tableName', (q) =>
        q.eq('userId', userId).eq('tableName', args.tableName),
      )
      .collect()

    return allLogs
      .filter((log) => log.sequenceNumber <= args.sequenceNumber)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
  },
})

// Note: Replay functionality should be implemented client-side since DuckDB
// queries execute via server functions. The replay functions below return
// the queries that need to be executed, which can then be executed client-side.

// Action to get the latest sequence number for a specific table
export const getLatestSequenceNumber = query({
  args: {
    tableName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    let dbQuery = ctx.db
      .query('queryLog')
      .withIndex('by_userId', (q) => q.eq('userId', userId))

    // Filter by tableName if provided
    if (args.tableName) {
      const tableName = args.tableName
      dbQuery = ctx.db
        .query('queryLog')
        .withIndex('by_userId_tableName', (q) =>
          q.eq('userId', userId).eq('tableName', tableName),
        )
    }

    const allQueries = await dbQuery.collect()

    if (allQueries.length === 0) return null

    return Math.max(...allQueries.map((q) => q.sequenceNumber))
  },
})
