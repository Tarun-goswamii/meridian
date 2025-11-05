import { components } from './_generated/api'
import { Agent, createTool } from '@convex-dev/agent'
import { createAnthropic } from '@ai-sdk/anthropic'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'
import { z } from 'zod'

const anth_claude = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const table_agent = new Agent(components.agent, {
  name: 'Insite Agent',
  languageModel: anth_claude.languageModel('claude-sonnet-4-0'),
  instructions: `You are a DuckDB query assistant. You help users write SQL queries for DuckDB.

You will be provided with:
- The table name
- Column names and their data types
- Sample rows from the table (when available)

Use this context to write accurate, efficient SQL queries that reference the correct column names and understand the data structure.

You MUST respond with a JSON object containing exactly two fields:
1. "command" - The DuckDB SQL query/command (can be any length)
2. "description" - A brief description of what the query does (50-60 words maximum)`,
  // tools: {},
  maxSteps: 3,
})

export const askClaude = action({
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
  },
  handler: async (ctx, { prompt, tableName, columns, sampleRows }) => {
    const user_id = await checkAuth(ctx)

    const thread = await table_agent.createThread(ctx, { userId: user_id })

    // Build context information
    const columnInfo = columns
      .map((col) => `${col.name} (${col.type})`)
      .join(', ')
    const sampleData =
      sampleRows && sampleRows.length > 0
        ? `\n\nSample data (first ${sampleRows.length} rows):\n${JSON.stringify(sampleRows, null, 2)}`
        : ''

    const contextualPrompt = `
TABLE CONTEXT:
- Table Name: ${tableName}
- Columns: ${columnInfo}${sampleData}

USER REQUEST:
${prompt}

Please write a DuckDB SQL query for the table "${tableName}" based on the user's request above.`

    const res = await table_agent.generateObject(
      ctx,
      { threadId: thread.threadId },
      {
        prompt: contextualPrompt,
        schema: z.object({
          command: z
            .string()
            .describe(
              'The query / command to execute on the duck db; Should always be valid Duck DB SQL code',
            ),
          description: z
            .string()
            .describe('A description of what the query does; Max 50 words'),
        }),
      },
    )

    try {
      // Validate the response has required fields
      if (!res.object.command || !res.object.description) {
        throw new Error('Invalid response format from agent')
      }

      return {
        command: res.object.command,
        description: res.object.description,
      }
    } catch (error) {
      // If parsing fails, return an error structure
      return {
        command: '',
        description: 'Error: Agent returned invalid response format',
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
