import { mutation, query, action } from './_generated/server'
import { v } from 'convex/values'
import { type Id } from './_generated/dataModel'
import { checkAuth } from './authFns'
import { api } from './_generated/api'
import Firecrawl from '@mendable/firecrawl-js'
import { r2 } from './r2'

// Save file metadata after upload
export const saveFile = mutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await checkAuth(ctx)

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
  handler: async (_, args) => {
    return await r2.getUrl(args.storageId)
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

    const url = await r2.getUrl(file.storageId)

    return {
      url,
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

    const url = await r2.getUrl(file.storageId)

    return {
      fileId: file._id,
      url,
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

    // Delete from storage
    await r2.deleteObject(ctx, file.storageId)

    // Delete from database
    await ctx.db.delete(args.fileId)

    return { success: true }
  },
})

// Helper function to generate a simple schema from prompt (without using agent)
// This helps Firecrawl extract more structured data
function generateSimpleSchema(prompt: string): any {
  const promptLower = prompt.toLowerCase()

  // Common patterns to detect
  const schema: any = {
    type: 'object',
    properties: {},
  }

  // Detect common fields from prompt keywords
  if (
    promptLower.includes('job') ||
    promptLower.includes('position') ||
    promptLower.includes('role')
  ) {
    schema.properties = {
      title: { type: 'string', description: 'Job title or position name' },
      company: { type: 'string', description: 'Company name' },
    }
    if (promptLower.includes('location') || promptLower.includes('city')) {
      schema.properties.location = {
        type: 'string',
        description: 'Job location',
      }
    }
    if (
      promptLower.includes('salary') ||
      promptLower.includes('pay') ||
      promptLower.includes('compensation')
    ) {
      schema.properties.salary = {
        type: 'string',
        description: 'Salary or compensation',
      }
    }
  } else if (promptLower.includes('product')) {
    schema.properties = {
      name: { type: 'string', description: 'Product name' },
      price: { type: 'string', description: 'Product price' },
      description: { type: 'string', description: 'Product description' },
    }
  } else if (promptLower.includes('article') || promptLower.includes('post')) {
    schema.properties = {
      title: { type: 'string', description: 'Article title' },
      author: { type: 'string', description: 'Author name' },
      date: { type: 'string', description: 'Publication date' },
      content: { type: 'string', description: 'Article content or summary' },
    }
  } else if (promptLower.includes('event')) {
    schema.properties = {
      name: { type: 'string', description: 'Event name' },
      date: { type: 'string', description: 'Event date' },
      location: { type: 'string', description: 'Event location' },
    }
  }

  // If we detected a list/array pattern, wrap in array
  if (
    promptLower.includes('list') ||
    promptLower.includes('all') ||
    promptLower.includes('each')
  ) {
    return {
      type: 'array',
      items: schema,
    }
  }

  // Default: return array of objects
  return {
    type: 'array',
    items:
      schema.type === 'object'
        ? schema
        : { type: 'object', properties: schema.properties || {} },
  }
}

// Action to extract data from URL using Firecrawl and return JSON data
export const createTableFromURL = action({
  args: {
    url: v.string(),
    prompt: v.string(),
    tableName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: true
    fileId: Id<'files'>
    storageId: string
    data: any[]
    tableName: string
    rowCount: number
    columnCount: number
  }> => {
    await checkAuth(ctx)
    const apiKey = process.env.FIRECRAWL_API_KEY

    if (!apiKey) {
      throw new Error(
        'Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable.',
      )
    }

    try {
      // Generate a simple schema from the prompt to help Firecrawl extract better structured data
      const schema = generateSimpleSchema(args.prompt)

      // Use Firecrawl to extract structured data from the URL
      const firecrawl = new Firecrawl({ apiKey })
      const extractResult = await firecrawl.extract({
        urls: [args.url],
        prompt: args.prompt,
        schema:
          schema.properties && Object.keys(schema.properties).length > 0
            ? schema
            : undefined,
      })

      if (!extractResult.data) {
        throw new Error('No data extracted from URL')
      }

      // Convert extracted data to array format
      const extractedData = Array.isArray(extractResult.data)
        ? extractResult.data
        : [extractResult.data]

      if (extractedData.length === 0) {
        throw new Error('No data extracted from URL')
      }

      // Generate table name from URL if not provided
      const tableName =
        args.tableName ||
        args.url
          .replace(/^https?:\/\//, '')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .toLowerCase()
          .slice(0, 50) ||
        'extracted_table'

      // Sanitize table name
      const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')

      // Store JSON data in Convex storage for reference
      const jsonBlob = new Blob([JSON.stringify(extractedData, null, 2)], {
        type: 'application/json',
      })
      const storageId = await r2.store(ctx, jsonBlob, {
        type: 'application/json',
      })

      // Save file metadata
      const fileName = `${sanitizedTableName}.json`
      const fileId = await ctx.runMutation(api.csv.saveFile, {
        storageId,
        fileName,
        fileType: 'application/json',
        fileSize: jsonBlob.size,
      })

      return {
        success: true,
        fileId,
        storageId,
        data: extractedData, // Return the JSON data directly
        tableName: sanitizedTableName,
        rowCount: extractedData.length,
        columnCount: extractedData[0]
          ? Object.keys(extractedData[0]).length
          : 0,
      }
    } catch (error) {
      console.error('Error extracting data from URL:', error)
      throw error instanceof Error
        ? error
        : new Error('Failed to extract data from URL')
    }
  },
})
