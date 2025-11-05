import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Check current user authentication status
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { isAuthenticated: false, userId: null }
    }

    const user = await ctx.db.query('users').first()
    return {
      isAuthenticated: true,
      userId,
      name: user?.name ?? 'User',
    }
  },
})

export async function checkAuth(ctx: any) {
  const user_id = await getAuthUserId(ctx)

  if (!user_id) throw new Error('Not authenticated')
  return user_id
}
