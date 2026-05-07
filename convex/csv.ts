import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'

// Save file metadata after upload
export const saveFile = mutation({
  args: {
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    fileContent: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await checkAuth(ctx)
    const storageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const fileId = await ctx.db.insert('files', {
      storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      fileContent: args.fileContent,
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
    const userId = await checkAuth(ctx)

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
    const file = await ctx.db
      .query('files')
      .filter((q) => q.eq(q.field('storageId'), args.storageId))
      .first()

    return file?.fileContent ?? null
  },
})

// Get file content for processing
export const getFileForProcessing = query({
  args: { fileId: v.id('files') },
  handler: async (ctx, args) => {
    const user_id = await checkAuth(ctx)

    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error('File not found')
    }

    if (file.uploadedBy !== user_id) {
      throw new Error('Not authorized to access this file')
    }

    return {
      fileContent: file.fileContent ?? null,
      fileName: file.fileName,
      fileType: file.fileType,
    }
  },
})

// Get file by DuckDB table name
export const getFileByTableName = query({
  args: { tableName: v.string() },
  handler: async (ctx, args) => {
    const user_id = await checkAuth(ctx)

    const file = await ctx.db
      .query('files')
      .filter((q) => q.eq(q.field('uploadedBy'), user_id))
      .filter((q) => q.eq(q.field('duckdbTableName'), args.tableName))
      .first()

    if (!file) {
      return null
    }

    return {
      fileId: file._id,
      fileContent: file.fileContent ?? null,
      fileName: file.fileName,
      fileType: file.fileType,
      storageId: file.storageId,
    }
  },
})

// Update file with DuckDB table info
export const updateDuckDBInfo = mutation({
  args: {
    fileId: v.id('files'),
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    const user_id = await checkAuth(ctx)
    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error('File not found')
    }

    if (file.uploadedBy !== user_id) {
      throw new Error('Not authorized to update this file')
    }

    await ctx.db.patch(args.fileId, {
      duckdbTableName: args.tableName,
      duckdbProcessed: true,
    })

    return { success: true }
  },
})

// Delete a file
export const deleteFile = mutation({
  args: { fileId: v.id('files') },
  handler: async (ctx, args) => {
    const user_id = await checkAuth(ctx)

    const file = await ctx.db.get(args.fileId)
    if (!file) {
      throw new Error('File not found')
    }

    if (file.uploadedBy !== user_id) {
      throw new Error('Not authorized to delete this file')
    }

    // Delete from database
    await ctx.db.delete(args.fileId)

    return { success: true }
  },
})

// Helper function to generate a simple schema from prompt (without using agent)
// This helps Firecrawl extract more structured data
// This function has been moved to convex/actions/csvActions.ts with "use node" directive
// to properly handle Node.js dependencies (undici)
