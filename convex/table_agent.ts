// x.com/TheIshanGoswami/status/1988346353660162394 - Do this / Firecrawl in agent
// Also, the tools are shown incrementally in the UI
// Harr msg mei pervious tools hai
import { api, components } from './_generated/api'
import { Agent, createTool } from '@convex-dev/agent'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'
import { z } from 'zod'

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
    const serverUrl =
      process.env.DUCKDB_SERVER_URL || 'https://de2261a83878.ngrok-free.app'

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

// Tool to query DuckDB
const queryDuckDB: any = createTool({
  description:
    'Execute a SQL query on DuckDB and return the results. Use this to read data from tables, columns, or specific entries. Returns columns, rows, and metadata.',
  args: z.object({
    query: z
      .string()
      .describe(
        'The SQL query to execute on DuckDB. Must be valid DuckDB SQL.',
      ),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query: args.query,
      })
      return {
        success: true,
        columns: result.columns || [],
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
        columnCount: result.columns?.length || 0,
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

// Tool to get table schema
const getTableSchema: any = createTool({
  description:
    'Get the schema (column names and types) of a table. Use this to understand what columns are available in a table.',
  args: z.object({
    tableName: z.string().describe('The name of the table to get schema for'),
  }),
  handler: async (ctx, args) => {
    try {
      const query = `DESCRIBE ${args.tableName}`
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query,
      })
      return {
        success: true,
        tableName: args.tableName,
        columns: result.columns || [],
        rows: result.rows || [],
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

// Tool to get sample rows from a table
const getSampleRows: any = createTool({
  description:
    'Get a sample of rows from a table. Use this to see example data and understand the structure of the table.',
  args: z.object({
    tableName: z.string().describe('The name of the table'),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe('Number of rows to return (default: 10, max: 100)'),
  }),
  handler: async (ctx, args) => {
    try {
      const limit = Math.min(Math.max(args.limit || 10, 1), 100)
      const query = `SELECT * FROM ${args.tableName} LIMIT ${limit}`
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query,
      })
      return {
        success: true,
        tableName: args.tableName,
        columns: result.columns || [],
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
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

Always output valid DuckDB SQL.
`,
  maxSteps: 3,
})

// Analysis Agent - uses tools to explore database and provides answers
const analysis_agent = new Agent(components.agent, {
  name: 'analysis_agent',
  languageModel: model,
  instructions: `
You are an intelligent assistant that helps users understand and analyze their database.

You have access to tools that let you:
- Query DuckDB to read data from tables
- Get table schemas to understand structure
- Get sample rows to see example data

When a user asks a question:
1. Use the available tools to explore the database and gather information
2. Analyze the data you retrieve
3. Provide a clear, helpful answer based on your findings


Be thorough but efficient. Use tools strategically to gather the information needed to answer the user's question.
`,
  // 4. Explain what data you looked at to arrive at your answer
  maxSteps: 10,
  tools: {
    queryDuckDB,
    getTableSchema,
    getSampleRows,
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

      for await (const st_part of stream.fullStream) {
        console.log('STREAM PART:', st_part)
      }
      // STREAMING --------------------------------

      // const assistantText = res.text ?? ''
      const assistantText = ''

      // Extract tool steps from the CURRENT response only (not previous messages)
      const toolSteps: Array<{
        tool: string
        args: any
        result: any
      }> = []

      const assistantCreatedAt = Date.now()
      const assistantSummary = summarizeText(assistantText)

      await ctx.runMutation(agentUtilsApi.insertAgentMessageRecord, {
        threadId: threadDoc._id,
        role: 'assistant',
        agentName,
        mode,
        content: assistantText,
        description: assistantSummary,
        commands: [],
        toolSteps: toolSteps.length > 0 ? toolSteps : undefined,
        createdAt: assistantCreatedAt,
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
