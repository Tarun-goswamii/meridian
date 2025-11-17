// x.com/TheIshanGoswami/status/1988346353660162394 - Do this / Firecrawl in agent
// Also, the tools are shown incrementally in the UI
// Harr msg mei pervious tools hai
import { api, components } from './_generated/api'
import { Agent } from '@convex-dev/agent'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'
import { z } from 'zod'
import Firecrawl from '@mendable/firecrawl-js'
import {
  queryDuckDB,
  getTableSchema,
  getSampleRows,
  createChart,
  generateInsights,
  firecrawlSearch,
  scrapeWebPage,
  extractWebPage,
  analyzeDataQuality,
  compareTables,
  getTableList,
} from './agent_tools'

const google_gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export const model = google_gemini.languageModel('gemini-2.5-flash')

// Gemini prompt/context max length limit - kept low for cost/speed efficiency
// ~8k chars ≈ 2k tokens, sufficient for table schemas + sample data + user queries
const GEMINI_PROMPT_LIMIT = 8000
function trimToLimit(str: string, limit = GEMINI_PROMPT_LIMIT) {
  if (str.length <= limit) return str
  // Prefer to keep start and end, losing middle (provides user's req/context + at least part of examples)
  const keep = Math.floor((limit - 200) / 2)
  return (
    str.slice(0, keep) +
    '\n\n... [TRUNCATED FOR LENGTH] ...\n\n' +
    str.slice(str.length - keep - 200)
  )
}

function createThreadTitle(prompt: string) {
  const cleaned = prompt
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
  const title = cleaned.slice(0, 120)
  return title || 'New conversation'
}

function summarizeText(text: string, limit = 200) {
  if (!text) return ''
  if (text.length <= limit) return text
  return text.slice(0, limit).trimEnd() + '...'
}

// Action to fetch DuckDB query results
export const fetchDuckDBQuery = action({
  args: { query: v.string() },
  handler: async (_, { query }) => {
    const serverUrl = 'https://6c961fbefc99.ngrok-free.app'

    const response = await fetch(`${serverUrl}/api/duckdb/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`HTTP error! status: ${response.status} body: ${text}`)
    }

    const result = await response.json()
    return result
  },
})

// Action to perform web search using Firecrawl
export const performFirecrawlSearch = action({
  args: { query: v.string(), maxResults: v.optional(v.number()) },
  handler: async (_, { query, maxResults = 10 }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY
    if (!apiKey) {
      throw new Error(
        'Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable.',
      )
    }

    try {
      const firecrawl = new Firecrawl({ apiKey })
      const result = await firecrawl.search(query, {
        limit: Math.min(maxResults, 20),
      })

      return {
        success: true,
        query,
        results: result.web || [],
        sources:
          result.web?.map((r: any) => ({
            title: r.title || '',
            url: r.url || '',
            content: r.description || '',
          })) || [],
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Action to scrape web page using Firecrawl SDK
export const scrapeWebPageAction = action({
  args: { url: v.string(), includeMarkdown: v.optional(v.boolean()) },
  handler: async (_, { url, includeMarkdown = true }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY
    if (!apiKey) {
      throw new Error(
        'Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable.',
      )
    }

    try {
      const firecrawl = new Firecrawl({ apiKey })
      const result = await firecrawl.scrape(url, {
        formats: includeMarkdown ? ['markdown', 'html'] : ['html'],
        onlyMainContent: true,
      })

      return {
        success: true,
        url,
        title: result.metadata?.title || '',
        markdown: result.markdown || '',
        html: result.html || '',
        content: result.markdown || result.html || '',
        description: result.metadata?.description || '',
        links: result.links || [],
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Action to extract structured data from web pages using Firecrawl
export const extractWebPageAction = action({
  args: {
    urls: v.array(v.string()),
    prompt: v.string(),
    schema: v.optional(v.any()),
  },
  handler: async (_, { urls, prompt, schema }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY
    if (!apiKey) {
      throw new Error(
        'Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable.',
      )
    }

    try {
      const firecrawl = new Firecrawl({ apiKey })
      const result = await firecrawl.extract({
        urls,
        prompt,
        schema: schema || undefined,
      })

      return {
        success: true,
        urls,
        data: result.data
          ? Array.isArray(result.data)
            ? result.data
            : [result.data]
          : [],
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Action to get list of all tables
export const getTableListAction = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    | { success: true; tables: string[]; count: number }
    | { success: false; error: string }
  > => {
    try {
      const query =
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"
      const result: any = await ctx.runAction(
        api.table_agent.fetchDuckDBQuery,
        {
          query,
        },
      )
      return {
        success: true,
        tables: result.rows?.map((row: any) => row.table_name) || [],
        count: result.rows?.length || 0,
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Action to analyze data quality
export const analyzeDataQualityAction = action({
  args: { tableName: v.string() },
  handler: async (
    ctx,
    { tableName },
  ): Promise<
    | {
        success: true
        tableName: string
        rowCount: number
        columnCount: number
        issues: Array<{
          column: string
          issue: string
          severity: 'low' | 'medium' | 'high'
          details: string
        }>
        issueCount: number
        qualityScore: number
      }
    | { success: false; error: string }
  > => {
    try {
      // Get table schema
      const schemaQuery = `DESCRIBE ${tableName}`
      const schemaResult: any = await ctx.runAction(
        api.table_agent.fetchDuckDBQuery,
        { query: schemaQuery },
      )

      if (!schemaResult.rows || schemaResult.rows.length === 0) {
        return {
          success: false,
          error: 'Table not found or has no columns',
        }
      }

      const columns: any[] = schemaResult.rows
      const issues: Array<{
        column: string
        issue: string
        severity: 'low' | 'medium' | 'high'
        details: string
      }> = []

      // Analyze each column
      for (const col of columns) {
        const colName = col.column_name || col.name
        const colType = col.column_type || col.type

        // Check for nulls
        const nullCheckQuery = `SELECT COUNT(*) as total, COUNT(${colName}) as non_null FROM ${tableName}`
        try {
          const nullResult = await ctx.runAction(
            api.table_agent.fetchDuckDBQuery,
            { query: nullCheckQuery },
          )
          if (nullResult.rows && nullResult.rows.length > 0) {
            const total = nullResult.rows[0].total || 0
            const nonNull = nullResult.rows[0].non_null || 0
            const nullPercent =
              total > 0 ? ((total - nonNull) / total) * 100 : 0

            if (nullPercent > 50) {
              issues.push({
                column: colName,
                issue: 'High null percentage',
                severity: 'high',
                details: `${nullPercent.toFixed(1)}% of values are null`,
              })
            } else if (nullPercent > 20) {
              issues.push({
                column: colName,
                issue: 'Moderate null percentage',
                severity: 'medium',
                details: `${nullPercent.toFixed(1)}% of values are null`,
              })
            }
          }
        } catch (err) {
          // Skip if query fails
        }

        // Check for duplicates (if column seems like an ID)
        if (
          colName.toLowerCase().includes('id') ||
          colName.toLowerCase().includes('key')
        ) {
          const duplicateQuery = `SELECT ${colName}, COUNT(*) as cnt FROM ${tableName} GROUP BY ${colName} HAVING COUNT(*) > 1 LIMIT 10`
          try {
            const dupResult = await ctx.runAction(
              api.table_agent.fetchDuckDBQuery,
              { query: duplicateQuery },
            )
            if (dupResult.rows && dupResult.rows.length > 0) {
              issues.push({
                column: colName,
                issue: 'Duplicate values found',
                severity: 'high',
                details: `Found ${dupResult.rows.length} duplicate values (may indicate data quality issue)`,
              })
            }
          } catch (err) {
            // Skip if query fails
          }
        }

        // Check for empty strings in text columns
        if (
          colType &&
          (colType.toLowerCase().includes('varchar') ||
            colType.toLowerCase().includes('text') ||
            colType.toLowerCase().includes('string'))
        ) {
          const emptyQuery = `SELECT COUNT(*) as empty_count FROM ${tableName} WHERE ${colName} = '' OR ${colName} IS NULL`
          try {
            const emptyResult = await ctx.runAction(
              api.table_agent.fetchDuckDBQuery,
              { query: emptyQuery },
            )
            if (emptyResult.rows && emptyResult.rows.length > 0) {
              const emptyCount = emptyResult.rows[0].empty_count || 0
              if (emptyCount > 0) {
                issues.push({
                  column: colName,
                  issue: 'Empty string values',
                  severity: 'low',
                  details: `Found ${emptyCount} empty or null string values`,
                })
              }
            }
          } catch (err) {
            // Skip if query fails
          }
        }
      }

      // Get row count
      const countQuery = `SELECT COUNT(*) as row_count FROM ${tableName}`
      const countResult: any = await ctx.runAction(
        api.table_agent.fetchDuckDBQuery,
        { query: countQuery },
      )
      const rowCount: number = countResult.rows?.[0]?.row_count || 0

      return {
        success: true,
        tableName,
        rowCount,
        columnCount: columns.length,
        issues,
        issueCount: issues.length,
        qualityScore:
          issues.length === 0
            ? 100
            : Math.max(
                0,
                100 -
                  issues.length * 10 -
                  issues.filter((i) => i.severity === 'high').length * 20,
              ),
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Query Agent - generates SQL queries
const query_agent = new Agent(components.agent, {
  name: 'Query Agent',
  languageModel: model,
  instructions: `
You are an assistant that writes DuckDB SQL queries.

Respond ONLY with a JSON object containing:
1. "commands": an array of valid DuckDB SQL queries (steps can be split, but use at most 10 per request).
2. "description": a concise summary of what the queries do (max 60 words).

Always output valid DuckDB SQL. You also have access to a bunch of tools.
`,
  maxSteps: 4,
  tools: {
    queryDuckDB,
    getTableSchema,
    getSampleRows,
    createChart,
    generateInsights,
    firecrawlSearch,
    scrapeWebPage,
    extractWebPage,
    analyzeDataQuality,
    compareTables,
    getTableList,
  },
})

// Analysis Agent - uses tools to explore database and provides answers
const analysis_agent = new Agent(components.agent, {
  name: 'analysis_agent',
  languageModel: model,
  instructions: `
You are an assistant that explores and analyzes databases and can search the web using Firecrawl.

Use the available tools to:
- Query and inspect DuckDB tables
- Visualize or analyze data
- Search or extract info from the web and URLs
- Assess data quality, compare tables, and list tables

Pick the right tools as needed, then answer clearly and efficiently.
`,
  maxSteps: 4,
  tools: {
    queryDuckDB,
    getTableSchema,
    getSampleRows,
    createChart,
    generateInsights,
    firecrawlSearch,
    scrapeWebPage,
    extractWebPage,
    analyzeDataQuality,
    compareTables,
    getTableList,
  },
})

export const askGemini = action({
  args: {
    prompt: v.string(),
    tableName: v.string(),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
      }),
    ),
    sampleRows: v.optional(v.array(v.any())),
    threadId: v.optional(v.string()),
    mode: v.union(v.literal('query'), v.literal('analysis')),
    serverUrl: v.optional(v.string()), // Frontend provides the server URL
  },
  handler: async (
    ctx,
    { prompt, tableName, columns, sampleRows, threadId, mode, serverUrl },
  ) => {
    const user_id = await checkAuth(ctx)

    // Update server URL if provided
    if (serverUrl) {
      process.env.DUCKDB_SERVER_URL = serverUrl
    }

    const agent = mode === 'query' ? query_agent : analysis_agent
    const agentName = mode === 'query' ? 'Query Agent' : 'Analysis Agent'
    const agentUtilsApi = api.agent_utils
    const now = Date.now()

    let threadDoc: any =
      threadId != null
        ? await ctx.runQuery(agentUtilsApi.getAgentThreadByExternalId, {
            agentThreadId: threadId,
          })
        : null

    if (threadId && (!threadDoc || threadDoc.userId !== user_id)) {
      throw new Error('Thread not found or access denied')
    }

    if (threadDoc && threadDoc.tableName !== tableName) {
      throw new Error('Thread does not belong to this table')
    }

    let agentThreadId = threadDoc?.agentThreadId ?? null
    let threadReference: { threadId: string } | null = threadDoc
      ? { threadId: threadDoc.agentThreadId }
      : null

    if (!agentThreadId) {
      const createdThread: any = await agent.createThread(ctx, {
        userId: user_id,
      })
      agentThreadId = createdThread.threadId
      threadReference = { threadId: createdThread.threadId }
      const createdDoc = await ctx.runMutation(
        agentUtilsApi.createAgentThreadRecord,
        {
          userId: user_id,
          tableName,
          agentThreadId,
          agentName,
          title: createThreadTitle(prompt),
          createdAt: now,
          lastMode: mode,
        },
      )
      if (!createdDoc) {
        throw new Error('Failed to persist agent thread')
      }
      threadDoc = createdDoc
    } else if (threadDoc) {
      await ctx.runMutation(agentUtilsApi.updateAgentThreadRecord, {
        threadId: threadDoc._id,
        agentName,
        lastMode: mode,
        updatedAt: now,
      })
      threadDoc = {
        ...threadDoc,
        agentName,
        lastMode: mode,
        updatedAt: now,
      }
    }

    if (!threadDoc || !agentThreadId || !threadReference) {
      throw new Error('Unable to initialise agent thread')
    }

    if (!threadDoc.title) {
      const title = createThreadTitle(prompt)
      await ctx.runMutation(agentUtilsApi.updateAgentThreadRecord, {
        threadId: threadDoc._id,
        title,
      })
      threadDoc = { ...threadDoc, title }
    }

    await ctx.runMutation(agentUtilsApi.insertAgentMessageRecord, {
      threadId: threadDoc._id,
      role: 'user',
      userId: user_id,
      mode,
      content: prompt,
      createdAt: now,
    })

    // Query mode -------------------------------------------------------------------------------------
    if (mode === 'query') {
      // Query mode: generate SQL queries
      const columnInfo = columns
        .map((col) => `${col.name} (${col.type})`)
        .join(', ')
      const sampleData =
        sampleRows && sampleRows.length > 0
          ? `\n\nSample data (first ${sampleRows.length} rows):\n${JSON.stringify(
              sampleRows,
              null,
              2,
            )}`
          : ''

      let contextualPrompt = `
TABLE CONTEXT:
- Table Name: ${tableName}
- Columns: ${columnInfo}${sampleData}

USER REQUEST:
${prompt}

Please write a DuckDB SQL queries for the table "${tableName}" based on the user's request above.`

      // Ensure Gemini prompt does not exceed limit
      contextualPrompt = trimToLimit(contextualPrompt, GEMINI_PROMPT_LIMIT)

      let finalObject: {
        commands: string[]
        description: string
      } = {
        commands: [],
        description: '',
      }

      try {
        const objstream = await agent.streamObject(ctx, threadReference, {
          prompt: contextualPrompt,
          schema: z.object({
            commands: z
              .array(
                z
                  .string()
                  .describe(
                    'The query / command to execute on the duck db Should always be valid Duck DB SQL code',
                  ),
              )
              .min(1)
              .max(10),
            description: z
              .string()
              .describe('A description of what the query does Max 50 words'),
          }),
        })

        const createdAt = Date.now()
        const message_id = await ctx.runMutation(
          agentUtilsApi.insertAgentMessageRecord,
          {
            threadId: threadDoc._id,
            role: 'assistant',
            agentName,
            mode,
            content: finalObject.description,
            description: finalObject.description,
            commands: finalObject.commands,
            createdAt: createdAt,
          },
        )

        // Only take the first valid partialObject, or the last one if multiple
        for await (const partialObject of objstream.partialObjectStream) {
          if (
            Array.isArray(partialObject.commands) &&
            typeof partialObject.description === 'string'
          ) {
            finalObject = {
              commands: partialObject.commands.filter(
                (cmd): cmd is string => typeof cmd === 'string',
              ),
              description: partialObject.description,
            }

            await ctx.scheduler.runAfter(
              0,
              agentUtilsApi.updateAgentMessageRecord,
              {
                threadId: threadDoc._id,
                messageId: message_id,
                agentName,
                mode,
                content: partialObject.description,
                description: partialObject.description,
                commands: Array.isArray(partialObject.commands)
                  ? partialObject.commands.filter(
                      (cmd: any): cmd is string => typeof cmd === 'string',
                    )
                  : [],
              },
            )
          }
        }

        // If no valid result, throw
        if (
          !finalObject.commands.length ||
          !finalObject.description ||
          typeof finalObject.description !== 'string'
        ) {
          throw new Error('Invalid response format from agent')
        }

        const assistantCreatedAt = Date.now()
        const assistantSummary = summarizeText(finalObject.description)

        await ctx.runMutation(agentUtilsApi.updateAgentThreadRecord, {
          threadId: threadDoc._id,
          agentName,
          lastMode: mode,
          updatedAt: assistantCreatedAt,
          lastMessageAt: assistantCreatedAt,
          lastMessageSummary: assistantSummary,
        })

        return {
          mode: 'query' as const,
          commands: finalObject.commands,
          description: finalObject.description,
          threadId: agentThreadId,
          toolSteps: [],
        }
      } catch (error) {
        const assistantCreatedAt = Date.now()
        const errorMessage =
          'Error: Agent returned invalid response format' +
          (error instanceof Error ? ` (${error.message})` : '')

        await ctx.runMutation(agentUtilsApi.insertAgentMessageRecord, {
          threadId: threadDoc._id,
          role: 'assistant',
          agentName,
          mode,
          content: errorMessage,
          description: errorMessage,
          commands: [],
          createdAt: assistantCreatedAt,
        })

        await ctx.runMutation(agentUtilsApi.updateAgentThreadRecord, {
          threadId: threadDoc._id,
          agentName,
          lastMode: mode,
          updatedAt: assistantCreatedAt,
          lastMessageAt: assistantCreatedAt,
          lastMessageSummary: summarizeText(errorMessage),
        })

        return {
          mode: 'query' as const,
          commands: [],
          description: 'Error: Agent returned invalid response format',
          threadId: agentThreadId,
          toolSteps: [],
        }
      }
      // Analysis mode ------------------------------------------------------------------------------
    } else {
      // Analysis mode --------------------------------------------------------------------------------
      let contextualPrompt = `
You are analyzing the table "${tableName}".

TABLE CONTEXT:
- Table Name: ${tableName}
- Columns: ${columns.map((col) => `${col.name} (${col.type})`).join(', ')}

USER REQUEST:
${prompt}

Use the available tools to explore the database and provide a helpful answer.`

      // Ensure Gemini prompt does not exceed limit
      contextualPrompt = trimToLimit(contextualPrompt, GEMINI_PROMPT_LIMIT)

      // const res = await agent.generateText(ctx, threadReference, {
      //   prompt: contextualPrompt,
      // })

      // console.log('ANALYSIS RES:', JSON.parse(JSON.stringify(res, null, 2)))

      // STREAMING --------------------------------
      const stream = await agent.streamText(ctx, threadReference, {
        prompt: contextualPrompt,
      })

      // Create message record before streaming (like query mode)
      const createdAt = Date.now()
      const message_id = await ctx.runMutation(
        agentUtilsApi.insertAgentMessageRecord,
        {
          threadId: threadDoc._id,
          role: 'assistant',
          agentName,
          mode,
          content: '',
          description: '',
          commands: [],
          toolSteps: undefined,
          createdAt: createdAt,
        },
      )

      // Track state during streaming
      let assistantText = ''
      const toolSteps: Array<{
        tool: string
        args: any
        result?: any
        finished: boolean
      }> = []
      // Map toolCallId to index in toolSteps array for quick updates
      const toolCallIdToIndex = new Map<string, number>()

      // Helper function to update message with current tool steps
      const updateMessageWithToolSteps = async () => {
        await ctx.scheduler.runAfter(
          0,
          agentUtilsApi.updateAgentMessageRecord,
          {
            threadId: threadDoc._id,
            messageId: message_id,
            agentName,
            mode,
            content: assistantText,
            description: summarizeText(assistantText),
            toolSteps: toolSteps.length > 0 ? toolSteps : undefined,
          },
        )
      }

      // Process stream parts
      for await (const st_part of stream.fullStream) {
        // Handle tool-input-start - tool call is starting
        // Note: tool-input-start uses 'id' field, while tool-call uses 'toolCallId'
        // They should match, so we use the same value for tracking
        if (st_part.type === 'tool-input-start') {
          const toolStart = st_part as any
          // Use 'id' from tool-input-start, which should match 'toolCallId' in tool-call
          const toolCallId = toolStart.id || toolStart.toolCallId
          if (toolCallId && toolStart.toolName) {
            // Check if we already have this tool call (shouldn't happen, but be safe)
            if (!toolCallIdToIndex.has(toolCallId)) {
              // Add tool step with finished: false
              const toolStepIndex = toolSteps.length
              toolSteps.push({
                tool: toolStart.toolName,
                args: {}, // Args will be filled in when tool-call arrives
                finished: false,
              })
              toolCallIdToIndex.set(toolCallId, toolStepIndex)

              // Update message immediately to show tool call started
              await updateMessageWithToolSteps()
            }
          }
        }

        // Handle tool-call - tool call details (name and args)
        if (st_part.type === 'tool-call') {
          const toolCall = st_part as any
          // tool-call uses 'toolCallId', which should match 'id' from tool-input-start
          const toolCallId = toolCall.toolCallId || toolCall.id
          if (toolCallId && toolCall.toolName && toolCall.input) {
            let toolStepIndex = toolCallIdToIndex.get(toolCallId)

            // If tool step doesn't exist yet (tool-input-start might not have fired),
            // create it now
            if (toolStepIndex === undefined) {
              toolStepIndex = toolSteps.length
              toolSteps.push({
                tool: toolCall.toolName,
                args: toolCall.input,
                finished: false,
              })
              toolCallIdToIndex.set(toolCallId, toolStepIndex)
            } else {
              // Update existing tool step with args
              toolSteps[toolStepIndex] = {
                ...toolSteps[toolStepIndex],
                tool: toolCall.toolName,
                args: toolCall.input,
              }
            }

            // Update message to show tool call with args
            await updateMessageWithToolSteps()
          }
        }

        // Handle tool results - tool call completed
        if (st_part.type === 'tool-result') {
          const toolResult = st_part as any
          // tool-result uses 'toolCallId', which should match 'id' from tool-input-start
          const toolCallId = toolResult.toolCallId || toolResult.id
          if (toolCallId && toolResult.toolName) {
            const toolStepIndex = toolCallIdToIndex.get(toolCallId)

            if (toolStepIndex !== undefined) {
              // Update existing tool step with result and mark as finished
              toolSteps[toolStepIndex] = {
                ...toolSteps[toolStepIndex],
                tool: toolResult.toolName,
                args: toolResult.input || toolSteps[toolStepIndex].args,
                result: toolResult.output,
                finished: true,
              }

              // Update message to show tool call completed
              await updateMessageWithToolSteps()
            } else {
              // Tool step doesn't exist, create it now (shouldn't happen, but be safe)
              toolSteps.push({
                tool: toolResult.toolName,
                args: toolResult.input || {},
                result: toolResult.output,
                finished: true,
              })
              toolCallIdToIndex.set(toolCallId, toolSteps.length - 1)
              await updateMessageWithToolSteps()
            }
          }
        }

        // Handle text deltas
        if (st_part.type === 'text-delta') {
          const textDelta = st_part as any
          if (textDelta.text) {
            assistantText += textDelta.text

            // Update message with accumulated text
            await ctx.scheduler.runAfter(
              0,
              agentUtilsApi.updateAgentMessageRecord,
              {
                threadId: threadDoc._id,
                messageId: message_id,
                agentName,
                mode,
                content: assistantText,
                description: summarizeText(assistantText),
                toolSteps: toolSteps.length > 0 ? toolSteps : undefined,
              },
            )
          }
        }
      }
      // STREAMING --------------------------------

      // Final update with complete data
      const assistantCreatedAt = Date.now()
      const assistantSummary = summarizeText(assistantText)

      await ctx.runMutation(agentUtilsApi.updateAgentMessageRecord, {
        threadId: threadDoc._id,
        messageId: message_id,
        agentName,
        mode,
        content: assistantText,
        description: assistantSummary,
        toolSteps: toolSteps.length > 0 ? toolSteps : undefined,
      })

      await ctx.runMutation(agentUtilsApi.updateAgentThreadRecord, {
        threadId: threadDoc._id,
        agentName,
        lastMode: mode,
        updatedAt: assistantCreatedAt,
        lastMessageAt: assistantCreatedAt,
        lastMessageSummary: assistantSummary,
      })

      return {
        mode: 'analysis' as const,
        text: assistantText,
        threadId: agentThreadId,
        toolSteps: toolSteps,
        commands: [], // Analysis mode doesn't generate commands
        description: assistantSummary, // Use first 200 chars as description
      }
    }
  },
})
