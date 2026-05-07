import { query } from './_generated/server'

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Dummy user ID for no-auth mode
const DUMMY_USER_ID = 'anonymous_user'

// Check current user authentication status
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    // Always return authenticated with dummy user
    return {
      isAuthenticated: true,
      userId: DUMMY_USER_ID,
      name: 'Guest User',
      email: 'guest@example.com',
      image: null,
    }
  },
})

export async function checkAuth(ctx: any) {
  // Always return dummy user ID - no auth required
  return DUMMY_USER_ID
}
