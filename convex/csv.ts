import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Generate a URL for uploading a file
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

// Save file metadata after upload
export const saveFile = mutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    console.log('USER ID', userId)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const fileId = await ctx.db.insert('files', {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      uploadedBy: userId,
      uploadedAt: Date.now(),
    })

    return fileId
  },
})

// Get all uploaded files
export const getFiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const files = await ctx.db
      .query('files')
      .filter((q) => q.eq(q.field('uploadedBy'), userId))
      .order('desc')
      .collect()

    return files
  },
})

// Get file URL
export const getFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

// Delete a file
export const deleteFile = mutation({
  args: { fileId: v.id('files') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error('File not found')
    }

    if (file.uploadedBy !== userId) {
      throw new Error('Not authorized to delete this file')
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId)

    // Delete from database
    await ctx.db.delete(args.fileId)

    return { success: true }
  },
})
