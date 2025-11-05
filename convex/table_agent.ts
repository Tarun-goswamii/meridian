import { components } from './_generated/api'
import { Agent, createTool } from '@convex-dev/agent'
import { createAnthropic } from '@ai-sdk/anthropic'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { checkAuth } from './authFns'
// import { z } from 'zod'

const anth_claude = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const table_agent = new Agent(components.agent, {
  name: 'Insite Agent',
  languageModel: anth_claude.languageModel('claude-sonnet-4-0'),
  instructions: 'You are a weather forecaster.',
  tools: {},
  maxSteps: 3,
})

export const askClaude = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const user_id = await checkAuth(ctx)

    const thread = await table_agent.createThread(ctx, { userId: user_id })

    const res = await table_agent.generateText(
      ctx,
      { threadId: thread.threadId },
      { prompt },
    )
    return res.text
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
