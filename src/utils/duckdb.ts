// There is a super weird error here that sometimes tells you to remove
// certain paths as external to the bundler @duckdb/node-bindings-darwin-x64/duckdb.node
// which I don't understand. This is running entirely on the server, it should NOT
// be happening. However, if you do run into this, just start the server without this
// import and then import it and call a route that uses it. Everything will work fine.
import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let duckDBInstance: DuckDBInstance | null = null
// let duckDBInstance: null = null

export const getDuckDB = createServerOnlyFn(async () => {
  if (!duckDBInstance) {
    duckDBInstance = await DuckDBInstance.create('myduck.db')
  }
  return duckDBInstance
})

export const queryDuckDB = createServerFn()
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    const db = await getDuckDB()
    const connection = await db.connect()
    const result = await connection.run(query)
    const rawRows = await result.getRows()

    // Get column names and types
    const columnCount = result.columnCount
    const columns = Array.from({ length: columnCount }, (_, i) => ({
      name: result.columnName(i),
      type: String(result.columnType(i)),
    }))

    // Convert rows to objects with proper serialization
    const rows = rawRows.map((row) => {
      const rowObj: Record<string, any> = {}
      columns.forEach((col, i) => {
        const value = row[i]

        // Handle BigInt serialization
        if (typeof value === 'bigint') {
          rowObj[col.name] = Number(value)
        }
        // Handle DuckDB date values
        else if (value && typeof value === 'object' && 'days' in value) {
          // Convert days since epoch to ISO date string
          const date = new Date(1970, 0, 1)
          date.setDate(date.getDate() + (value as any).days)
          rowObj[col.name] = date.toISOString().split('T')[0]
        }
        // Handle null/undefined
        else if (value === null || value === undefined) {
          rowObj[col.name] = null
        }
        // Handle other types
        else {
          rowObj[col.name] = value
        }
      })
      return rowObj
    })

    connection.closeSync()
    return JSON.stringify({ columns, rows })
  })

export const createTableFromCSV = createServerFn()
  .inputValidator((input: { csvUrl: string; tableName: string }) => input)
  .handler(async ({ data }) => {
    const { csvUrl, tableName } = data
    let tempFilePath: string | null = null

    try {
      const db = await getDuckDB()
      const connection = await db.connect()

      // Fetch CSV content from Convex storage URL
      const response = await fetch(csvUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`)
      }

      const csvContent = await response.text()

      // Create a temporary file for the CSV
      const tempDir = mkdtempSync(join(tmpdir(), 'duckdb-csv-'))
      tempFilePath = join(tempDir, 'temp.csv')
      writeFileSync(tempFilePath, csvContent, 'utf-8')

      // Sanitize table name
      const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')

      // Drop table if it exists
      await connection.run(`DROP TABLE IF EXISTS ${sanitizedTableName}`)

      // Create table from CSV file
      // DuckDB's read_csv_auto function auto-detects schema
      await connection.run(`
        CREATE TABLE ${sanitizedTableName} AS
        SELECT * FROM read_csv_auto('${tempFilePath}')
      `)

      console.log(`Successfully created table: ${sanitizedTableName}`)

      // Get table info
      const result = await connection.run(`
        SELECT COUNT(*) as row_count FROM ${sanitizedTableName}
      `)
      const rows = await result.getRows()

      connection.closeSync()

      // Extract row count from the result
      const rowCount =
        rows.length > 0 && Array.isArray(rows[0]) ? (rows[0][0] as number) : 0

      return {
        success: true,
        tableName: sanitizedTableName,
        rowCount,
      }
    } catch (error) {
      console.error('Error creating table from CSV:', error)
      throw error
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          unlinkSync(tempFilePath)
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError)
        }
      }
    }
  })

// Analytics query function for insights generation
// Executes DuckDB queries and returns raw results (no JSON stringification)
export const queryDuckDBAnalytics = createServerFn()
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    const db = await getDuckDB()
    const connection = await db.connect()
    const result = await connection.run(query)
    const rawRows = await result.getRows()

    // Get column names and types
    const columnCount = result.columnCount
    const columns = Array.from({ length: columnCount }, (_, i) => ({
      name: result.columnName(i),
      type: String(result.columnType(i)),
    }))

    // Convert rows to objects with proper serialization
    const rows = rawRows.map((row) => {
      const rowObj: Record<string, any> = {}
      columns.forEach((col, i) => {
        const value = row[i]

        // Handle BigInt serialization
        if (typeof value === 'bigint') {
          rowObj[col.name] = Number(value)
        }
        // Handle DuckDB date values
        else if (value && typeof value === 'object' && 'days' in value) {
          // Convert days since epoch to ISO date string
          const date = new Date(1970, 0, 1)
          date.setDate(date.getDate() + (value as any).days)
          rowObj[col.name] = date.toISOString().split('T')[0]
        }
        // Handle null/undefined
        else if (value === null || value === undefined) {
          rowObj[col.name] = null
        }
        // Handle other types
        else {
          rowObj[col.name] = value
        }
      })
      return rowObj
    })

    connection.closeSync()
    return { columns, rows }
  })
