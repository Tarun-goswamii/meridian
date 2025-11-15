import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'

export const getAgentThreadByExternalId = query({
  args: {
    agentThreadId: v.string(),
  },
  handler: async (ctx, { agentThreadId }) => {
    const thread = await ctx.db
      .query('agentThreads')
      .withIndex('by_agentThreadId', (q) =>
        q.eq('agentThreadId', agentThreadId),
      )
      .unique()
    return thread
  },
})

export const listAgentThreads = query({
  args: {
    tableName: v.string(),
  },
  handler: async (ctx, { tableName }) => {
    const userId = await checkAuth(ctx)
    const threads = await ctx.db
      .query('agentThreads')
      .withIndex('by_user_table_lastMessageAt', (q) =>
        q.eq('userId', userId).eq('tableName', tableName),
      )
      .collect()

    threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)

    return threads.map((thread) => ({
      _id: thread._id,
      agentThreadId: thread.agentThreadId,
      tableName: thread.tableName,
      agentName: thread.agentName,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      lastMessageAt: thread.lastMessageAt,
      lastMessageSummary: thread.lastMessageSummary,
      lastMode: thread.lastMode,
    }))
  },
})

export const getAgentThreadMessages = query({
  args: {
    agentThreadId: v.string(),
  },
  handler: async (ctx, { agentThreadId }) => {
    const userId = await checkAuth(ctx)
    const thread = await ctx.db
      .query('agentThreads')
      .withIndex('by_agentThreadId', (q) =>
        q.eq('agentThreadId', agentThreadId),
      )
      .unique()

    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found or access denied')
    }

    const messages = await ctx.db
      .query('agentMessages')
      .withIndex('by_thread', (q) => q.eq('threadId', thread._id))
      .collect()

    messages.sort((a, b) => a.createdAt - b.createdAt)

    return {
      thread: {
        _id: thread._id,
        agentThreadId: thread.agentThreadId,
        tableName: thread.tableName,
        agentName: thread.agentName,
        title: thread.title,
        lastMode: thread.lastMode,
        lastMessageAt: thread.lastMessageAt,
        lastMessageSummary: thread.lastMessageSummary,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      },
      messages: messages.map((message) => ({
        _id: message._id,
        role: message.role,
        content: message.content,
        description: message.description,
        commands: message.commands ?? [],
        toolSteps: message.toolSteps ?? [],
        mode: message.mode,
        agentName: message.agentName,
        createdAt: message.createdAt,
      })),
    }
  },
})

export const createAgentThreadRecord = mutation({
  args: {
    userId: v.string(),
    tableName: v.string(),
    agentThreadId: v.string(),
    agentName: v.string(),
    title: v.string(),
    createdAt: v.number(),
    lastMode: v.union(v.literal('query'), v.literal('analysis')),
  },
  handler: async (
    ctx,
    { userId, tableName, agentThreadId, agentName, title, createdAt, lastMode },
  ) => {
    const threadId = await ctx.db.insert('agentThreads', {
      userId,
      tableName,
      agentThreadId,
      agentName,
      title,
      createdAt,
      updatedAt: createdAt,
      lastMessageAt: createdAt,
      lastMessageSummary: '',
      lastMode,
    })
    return await ctx.db.get(threadId)
  },
})

export const updateAgentThreadRecord = mutation({
  args: {
    threadId: v.id('agentThreads'),
    title: v.optional(v.string()),
    agentName: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    lastMessageAt: v.optional(v.number()),
    lastMessageSummary: v.optional(v.string()),
    lastMode: v.optional(v.union(v.literal('query'), v.literal('analysis'))),
  },
  handler: async (
    ctx,
    {
      threadId,
      title,
      agentName,
      updatedAt,
      lastMessageAt,
      lastMessageSummary,
      lastMode,
    },
  ) => {
    const patch: Record<string, any> = {}
    if (title !== undefined) patch.title = title
    if (agentName !== undefined) patch.agentName = agentName
    if (updatedAt !== undefined) patch.updatedAt = updatedAt
    if (lastMessageAt !== undefined) patch.lastMessageAt = lastMessageAt
    if (lastMessageSummary !== undefined) {
      patch.lastMessageSummary = lastMessageSummary
    }
    if (lastMode !== undefined) patch.lastMode = lastMode
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(threadId, patch)
    }
  },
})

export const insertAgentMessageRecord = mutation({
  args: {
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
          result: v.optional(v.any()),
          finished: v.boolean(),
        }),
      ),
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const insertedId = await ctx.db.insert('agentMessages', args)
    return insertedId
  },
})

export const updateAgentMessageRecord = mutation({
  args: {
    threadId: v.id('agentThreads'),
    // At least one of the following fields must be provided to patch
    role: v.optional(v.union(v.literal('user'), v.literal('assistant'))),
    userId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    mode: v.optional(v.union(v.literal('query'), v.literal('analysis'))),
    content: v.optional(v.string()),
    description: v.optional(v.string()),
    commands: v.optional(v.array(v.string())),
    toolSteps: v.optional(
      v.array(
        v.object({
          tool: v.string(),
          args: v.any(),
          result: v.optional(v.any()),
          finished: v.boolean(),
        }),
      ),
    ),
    createdAt: v.optional(v.number()),
    messageId: v.id('agentMessages'), // to identify which message in the thread to patch
  },
  handler: async (ctx, args) => {
    // Require messageId to identify which message to update
    if (!args.messageId) {
      throw new Error('Missing messageId to update agent message')
    }
    const { messageId, ...fields } = args

    await ctx.db.patch(messageId, fields)
  },
})
