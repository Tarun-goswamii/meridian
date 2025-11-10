import { createFileRoute } from '@tanstack/react-router'
import { queryDuckDB } from '~/utils/duckdb'

export const Route = createFileRoute('/api/duckdb/query')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { query } = body

          if (!query || typeof query !== 'string') {
            return new Response(
              JSON.stringify({ error: 'Query is required and must be a string' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          const result = await queryDuckDB({ data: query })
          const parsed = JSON.parse(result)

          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : 'Unknown error occurred',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      },
    },
  },
})
