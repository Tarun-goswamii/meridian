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

// Action to fetch DuckDB query results
export const fetchDuckDBQuery = action({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const serverUrl =
      process.env.DUCKDB_SERVER_URL || 'https://169d9edabf2c.ngrok-free.app'
    console.log('[fetchDuckDBQuery] About to fetch', {
      url: `${serverUrl}/api/duckdb/query`,
      query,
    })

    const response = await fetch(`${serverUrl}/api/duckdb/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    console.log('[fetchDuckDBQuery] Fetch response status:', response.status)
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.error('[fetchDuckDBQuery] HTTP error', response.status, text)
      throw new Error(`HTTP error! status: ${response.status} body: ${text}`)
    }

    const result = await response.json()
    console.log('[fetchDuckDBQuery] Result:', result)
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
      console.error('[queryDuckDB] Error:', error)
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
      console.log('[getTableSchema] About to fetch schema for:', args.tableName)
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query,
      })
      console.log('[getTableSchema] Result:', result)
      return {
        success: true,
        tableName: args.tableName,
        columns: result.columns || [],
        rows: result.rows || [],
      }
    } catch (error) {
      console.error('[getTableSchema] Error:', error)
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
      console.log(
        '[getSampleRows] About to fetch sample rows for:',
        args.tableName,
      )
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query,
      })
      console.log('[getSampleRows] Result:', result)
      return {
        success: true,
        tableName: args.tableName,
        columns: result.columns || [],
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
      }
    } catch (error) {
      console.error('[getSampleRows] Error:', error)
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
4. Explain what data you looked at to arrive at your answer

Be thorough but efficient. Use tools strategically to gather the information needed to answer the user's question.
`,
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
      console.log('[askGemini] Overriding DUCKDB_SERVER_URL with:', serverUrl)
      process.env.DUCKDB_SERVER_URL = serverUrl
    }

    const agent = mode === 'query' ? query_agent : analysis_agent

    let thread
    if (threadId) {
      thread = { threadId }
    } else {
      thread = await agent.createThread(ctx, { userId: user_id })
    }

    if (mode === 'query') {
      // Query mode: generate SQL queries
      const columnInfo = columns
        .map((col) => `${col.name} (${col.type})`)
        .join(', ')
      const sampleData =
        sampleRows && sampleRows.length > 0
          ? `\n\nSample data (first ${sampleRows.length} rows):\n${JSON.stringify(sampleRows, null, 2)}`
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

      console.log('[askGemini] Query mode contextualPrompt:', contextualPrompt)

      const res = await agent.generateObject(
        ctx,
        { threadId: thread.threadId },
        {
          prompt: contextualPrompt,
          schema: z.object({
            commands: z
              .array(
                z
                  .string()
                  .describe(
                    'The query / command to execute on the duck db; Should always be valid Duck DB SQL code',
                  ),
              )
              .min(1)
              .max(10),
            description: z
              .string()
              .describe('A description of what the query does; Max 50 words'),
          }),
        },
      )

      try {
        if (!res.object.commands || !res.object.description) {
          throw new Error('Invalid response format from agent')
        }

        return {
          mode: 'query' as const,
          commands: res.object.commands,
          description: res.object.description,
          threadId: thread.threadId,
          toolSteps: [], // Query mode doesn't use tools
        }
      } catch (error) {
        console.error('[askGemini] Error in query mode:', error)
        return {
          mode: 'query' as const,
          commands: [],
          description: 'Error: Agent returned invalid response format',
          threadId: thread.threadId,
          toolSteps: [],
        }
      }
    } else {
      // Analysis mode: use tools and generate text response
      let contextualPrompt = `
You are analyzing the table "${tableName}".

TABLE CONTEXT:
- Table Name: ${tableName}
- Columns: ${columns.map((col) => `${col.name} (${col.type})`).join(', ')}

USER REQUEST:
${prompt}

Use the available tools to explore the database and provide a helpful answer. Show what data you examined.`

      // Ensure Gemini prompt does not exceed limit
      contextualPrompt = trimToLimit(contextualPrompt, GEMINI_PROMPT_LIMIT)

      console.log(
        '[askGemini] Analysis mode contextualPrompt:',
        contextualPrompt,
      )

      const res = await agent.generateText(
        ctx,
        { threadId: thread.threadId },
        {
          prompt: contextualPrompt,
        },
      )

      // Extract tool steps from the response
      const toolSteps: Array<{
        tool: string
        args: any
        result: any
      }> = []

      // The agent framework should provide tool call information
      // We'll need to extract this from the response or thread history
      // For now, we'll return the text and let the frontend handle tool step display

      return {
        mode: 'analysis' as const,
        text: res.text,
        threadId: thread.threadId,
        toolSteps: toolSteps,
        commands: [], // Analysis mode doesn't generate commands
        description: res.text.substring(0, 200), // Use first 200 chars as description
      }
    }
  },
})

// const getWeather = createTool({
//   description: 'Get the current weather for a city',
//   args: z.object({ city: z.string().describe('The city to get weather for') }),
//   handler: async (ctx, args) => {
//     return {
//       city: args.city,
//       temperature: '26 °C',
//       description: 'Weather in' + args.city + ' is 26 °C',
//     }
//   },
// })
