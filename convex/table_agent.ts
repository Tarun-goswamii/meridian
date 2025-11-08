import { components } from './_generated/api'
import { Agent } from '@convex-dev/agent'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'
import { z } from 'zod'

const google_gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export const model = google_gemini.languageModel('gemini-2.5-flash')

const table_agent = new Agent(components.agent, {
  name: 'Insite Agent',
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
  },
  handler: async (
    ctx,
    { prompt, tableName, columns, sampleRows, threadId },
  ) => {
    const user_id = await checkAuth(ctx)

    let thread
    if (threadId) {
      thread = { threadId }
    } else {
      thread = await table_agent.createThread(ctx, { userId: user_id })
    }

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

Please write a DuckDB SQL queries for the table "${tableName}" based on the user's request above.`

    const res = await table_agent.generateObject(
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
        commands: res.object.commands,
        description: res.object.description,
        threadId: thread.threadId,
      }
    } catch (error) {
      return {
        commands: [],
        description: 'Error: Agent returned invalid response format',
        threadId: thread.threadId,
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
