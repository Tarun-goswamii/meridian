import { createFileRoute } from '@tanstack/react-router'
import { queryDuckDB } from '~/utils/duckdb'

export const Route = createFileRoute('/api/duckdb/query')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('Received POST request to /api/duckdb/query')
        try {
          const body = await request.json()
          console.log('Request body:', body)
          const { query } = body

          if (!query || typeof query !== 'string') {
            console.log('Invalid or missing query:', query)
            return new Response(
              JSON.stringify({ error: 'Query is required and must be a string' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          console.log('Executing DuckDB query:', query)
          const result = await queryDuckDB({ data: query })
          console.log('Raw DuckDB result:', result)
          const parsed = JSON.parse(result)
          console.log('Parsed DuckDB result:', parsed)

          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error executing DuckDB query:', error)
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
