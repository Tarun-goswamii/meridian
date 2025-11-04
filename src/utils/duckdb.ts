import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'

let duckDBInstance: DuckDBInstance | null = null

export const getDuckDB = createServerOnlyFn(async () => {
  if (!duckDBInstance) {
    duckDBInstance = await DuckDBInstance.create()
  }
  return duckDBInstance
})

export const queryDatabase = createServerFn()
  .inputValidator((query: string) => query)
  .handler(async ({ data }) => {
    const db = await getDuckDB()
    const connection = await db.connect()
    const result = await connection.run(data)

    console.log(await result.getRows())
    connection.closeSync()
  })
