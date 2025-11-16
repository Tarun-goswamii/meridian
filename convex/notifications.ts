import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { type Id } from './_generated/dataModel'

export type NotificationType =
  | 'query'
  | 'agent_query'
  | 'agent_analysis'
  | 'insights_generated'
  | 'chart_created'

/**
 * Broadcast a notification to all users viewing a table (except the sender)
 * The client-side component will filter out notifications from the current user
 */
export const broadcastNotification = mutation({
  args: {
    tableName: v.string(),
    type: v.union(
      v.literal('query'),
      v.literal('agent_query'),
      v.literal('agent_analysis'),
      v.literal('insights_generated'),
      v.literal('chart_created'),
    ),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Get user info for the notification
    let userName: string | undefined
    let userImage: string | undefined

    try {
      const user = await ctx.db.get(userId as Id<'users'>)
      if (user) {
        userName = user.name
        userImage = user.image
      }
    } catch (e) {
      // If user lookup fails, continue without user info
      console.error('Failed to get user info for notification:', e)
    }

    // Create notification - clients will filter based on their own userId
    const notificationId = await ctx.db.insert('notifications', {
      tableName: args.tableName,
      userId: userId,
      userName: userName,
      userImage: userImage,
      type: args.type,
      message: args.message,
      metadata: args.metadata,
      createdAt: Date.now(),
    })

    return { notificationId }
  },
})

/**
 * Query recent notifications for a table
 */
export const getTableNotifications = query({
  args: {
    tableName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_tableName_createdAt', (q) =>
        q.eq('tableName', args.tableName),
      )
      .order('desc')
      .take(limit)

    return notifications
  },
})

/**
 * Get the latest notification for a table (for real-time subscriptions)
 */
export const getLatestNotification = query({
  args: {
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db
      .query('notifications')
      .withIndex('by_tableName_createdAt', (q) =>
        q.eq('tableName', args.tableName),
      )
      .order('desc')
      .first()

    return notification
  },
})
