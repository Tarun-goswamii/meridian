import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
  files: defineTable({
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    uploadedBy: v.string(),
    uploadedAt: v.number(),
    duckdbTableName: v.optional(v.string()),
    duckdbProcessed: v.optional(v.boolean()),
  }).index('by_uploadedBy', ['uploadedBy']),
  insightsCache: defineTable({
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
    createdAt: v.number(),
    userId: v.string(),
  })
    .index('by_cacheKey', ['cacheKey'])
    .index('by_userId', ['userId']),
  queryLog: defineTable({
    query: v.string(),
    executedAt: v.number(),
    userId: v.string(),
    tableName: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
    sequenceNumber: v.number(),
    resultMetadata: v.optional(
      v.object({
        rowCount: v.optional(v.number()),
        columnCount: v.optional(v.number()),
        executionTimeMs: v.optional(v.number()),
      }),
    ),
  })
    .index('by_userId', ['userId'])
    .index('by_sequenceNumber', ['sequenceNumber'])
    .index('by_tableName', ['tableName'])
    .index('by_userId_tableName', ['userId', 'tableName']),
  agentThreads: defineTable({
    userId: v.string(),
    tableName: v.string(),
    agentThreadId: v.string(),
    agentName: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
    lastMessageSummary: v.optional(v.string()),
    lastMode: v.optional(v.union(v.literal('query'), v.literal('analysis'))),
  })
    .index('by_agentThreadId', ['agentThreadId'])
    .index('by_user_table', ['userId', 'tableName'])
    .index('by_user_table_lastMessageAt', [
      'userId',
      'tableName',
      'lastMessageAt',
    ]),
  agentMessages: defineTable({
    threadId: v.id('agentThreads'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    userId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    mode: v.union(v.literal('query'), v.literal('analysis')),
    content: v.string(),
    description: v.optional(v.string()),
    commands: v.optional(v.array(v.string())),
    toolSteps: v.optional(
      v.array(
        v.object({
          tool: v.string(),
          args: v.any(),
          result: v.any(),
        }),
      ),
    ),
    createdAt: v.number(),
  }).index('by_thread', ['threadId']),
})
