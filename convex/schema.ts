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
    .index('by_sequenceNumber', ['sequenceNumber']),
})
