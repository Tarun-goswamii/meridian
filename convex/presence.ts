import { mutation, query } from './_generated/server'
import { components } from './_generated/api'
import { v } from 'convex/values'
import { Presence } from '@convex-dev/presence'
import { type Id } from './_generated/dataModel'

export const presence = new Presence(components.presence)

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    // TODO: Add your auth checks here.
    return await presence.heartbeat(ctx, roomId, userId, sessionId, interval)
  },
})

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    // Optionally check auth here if needed using authFns
    // await authFns.checkAuth(ctx);

    // Join presence state with user info.
    const presenceList = await presence.list(ctx, roomToken)

    const listWithUserInfo = await Promise.all(
      presenceList.map(async (entry) => {
        try {
          const user = await ctx.db.get(entry.userId as Id<'users'>)
          if (!user) {
            // If user not found (possibly invalid userId), leave it as is
            return entry
          }
          return {
            ...entry,
            name: user.name,
            image: user.image,
          }
        } catch (e) {
          // If there's an error (e.g., bad userId), just return the entry as is
          return entry
        }
      }),
    )

    return listWithUserInfo
  },
})

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Can't check auth here because it's called over http from sendBeacon.
    return await presence.disconnect(ctx, sessionToken)
  },
})
