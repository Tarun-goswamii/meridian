import { R2 } from '@convex-dev/r2'
import { components } from './_generated/api'
import { checkAuth } from './authFns'

export const r2 = new R2(components.r2)

export const {
  generateUploadUrl,
  syncMetadata,
  onSyncMetadata,
  getMetadata,
  listMetadata,
  deleteObject,
} = r2.clientApi({
  checkUpload: async (ctx) => {
    await checkAuth(ctx)
  },
})

