// There is a super weird error here that sometimes tells you to remove
// certain paths as external to the bundler @duckdb/node-bindings-darwin-x64/duckdb.node
// which I don't understand. This is running entirely on the server, it should NOT
// be happening. However, if you do run into this, just start the server without this
// import and then import it and call a route that uses it. Everything will be fine, don't kill yrslf.
import { DuckDBInstance } from '@duckdb/node-api'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let duckDBInstance: DuckDBInstance | null = null
// let duckDBInstance: null = null

export const getDuckDB = createServerOnlyFn(async () => {
  if (!duckDBInstance) {
    duckDBInstance = await DuckDBInstance.create(
      `md:?token=${process.env.MD_ACCESS_TOKEN}`,
    )
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

// Helper function to infer DuckDB type from JavaScript value
function inferDuckDBType(value: any): string {
  if (value === null || value === undefined) {
    return 'VARCHAR' // Default to VARCHAR for null values
  }
  if (typeof value === 'boolean') {
    return 'BOOLEAN'
  }
  if (typeof value === 'number') {
    // Check if it's an integer
    if (Number.isInteger(value)) {
      return 'BIGINT'
    }
    return 'DOUBLE'
  }
  if (typeof value === 'string') {
    return 'VARCHAR'
  }
  if (value instanceof Date) {
    return 'DATE'
  }
  // For objects and arrays, store as JSON string
  if (typeof value === 'object') {
    return 'VARCHAR' // Store as JSON string
  }
  return 'VARCHAR' // Default fallback
}

// Helper function to determine the best type for a column based on all values
function determineColumnType(values: any[]): string {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined)
  if (nonNullValues.length === 0) {
    return 'VARCHAR'
  }

  // Check if all values are of the same type
  const types = new Set(nonNullValues.map((v) => typeof v))

  // If mixed types, default to VARCHAR
  if (types.size > 1) {
    return 'VARCHAR'
  }

  const firstType = nonNullValues[0]
  const inferredType = inferDuckDBType(firstType)

  // If it's an object/array, always use VARCHAR to store as JSON
  if (typeof firstType === 'object' && !(firstType instanceof Date)) {
    return 'VARCHAR'
  }

  return inferredType
}

// Helper function to sanitize column names for SQL
function sanitizeColumnName(name: string): string {
  // Replace invalid characters with underscore
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&')
}

// Helper function to escape SQL string values
function escapeSQLString(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'object') {
    // Convert objects/arrays to JSON strings
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`
  }
  // Escape single quotes in strings
  return `'${String(value).replace(/'/g, "''")}'`
}

// Helper function to flatten nested JSON structures
// Expands arrays within objects into separate rows
function flattenJSONData(data: any[]): any[] {
  if (!data || data.length === 0) {
    return []
  }

  const flattened: any[] = []

  for (const item of data) {
    if (typeof item !== 'object' || item === null) {
      // Skip non-object items
      continue
    }

    // Check if this item has any array values that should be expanded
    const arrayKeys: string[] = []
    const nonArrayData: Record<string, any> = {}

    for (const [key, value] of Object.entries(item)) {
      if (Array.isArray(value) && value.length > 0) {
        // Check if array contains objects (should be expanded)
        const firstElement = value[0]
        if (
          typeof firstElement === 'object' &&
          firstElement !== null &&
          !Array.isArray(firstElement)
        ) {
          arrayKeys.push(key)
        } else {
          // Array of primitives - keep as is
          nonArrayData[key] = value
        }
      } else {
        // Non-array value - keep as is
        nonArrayData[key] = value
      }
    }

    if (arrayKeys.length === 0) {
      // No arrays to expand, add item as-is
      flattened.push(item)
    } else {
      // Expand arrays into separate rows
      // Use the first array to determine row count
      const firstArrayKey = arrayKeys[0]
      const firstArray = item[firstArrayKey] as any[]

      for (const arrayItem of firstArray) {
        const newRow: any = { ...nonArrayData }

        // Add all properties from the array item
        if (typeof arrayItem === 'object' && arrayItem !== null) {
          for (const [key, value] of Object.entries(arrayItem)) {
            newRow[key] = value
          }
        } else {
          // If array item is primitive, use the array key name
          newRow[firstArrayKey] = arrayItem
        }

        // Handle other arrays if they exist (should have same length)
        for (let i = 1; i < arrayKeys.length; i++) {
          const arrayKey = arrayKeys[i]
          const array = item[arrayKey] as any[]
          const index = firstArray.indexOf(arrayItem)
          if (index < array.length) {
            const otherItem = array[index]
            if (typeof otherItem === 'object' && otherItem !== null) {
              for (const [key, value] of Object.entries(otherItem)) {
                newRow[`${arrayKey}_${key}`] = value
              }
            } else {
              newRow[arrayKey] = otherItem
            }
          }
        }

        flattened.push(newRow)
      }
    }
  }

  return flattened
}

// Create DuckDB table directly from JSON data
export const createTableFromJSON = createServerFn()
  .inputValidator((input: { data: any[]; tableName: string }) => input)
  .handler(async ({ data }) => {
    const { data: jsonData, tableName } = data

    if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error('JSON data must be a non-empty array')
    }

    try {
      const db = await getDuckDB()
      const connection = await db.connect()

      // Sanitize table name
      const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')

      // Flatten nested JSON structures (expand arrays into rows)
      const flattenedData = flattenJSONData(jsonData)

      if (flattenedData.length === 0) {
        throw new Error('No data after flattening JSON structure')
      }

      // Analyze the flattened data structure to determine column types
      const allKeys = new Set<string>()
      flattenedData.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach((key) => allKeys.add(key))
        }
      })

      const columns = Array.from(allKeys)
      if (columns.length === 0) {
        throw new Error('No columns found in JSON data')
      }

      // Determine column types by analyzing all values
      // Map original column names to sanitized names
      const columnMap = new Map<string, string>()
      const columnDefs: Array<{
        name: string
        type: string
        originalName: string
      }> = []
      columns.forEach((colName) => {
        const sanitized = sanitizeColumnName(colName)
        columnMap.set(colName, sanitized)
        const values = flattenedData.map((item) => item?.[colName])
        const colType = determineColumnType(values)
        columnDefs.push({
          name: sanitized,
          type: colType,
          originalName: colName,
        })
      })

      // Drop table if it exists
      await connection.run(`DROP TABLE IF EXISTS ${sanitizedTableName}`)

      // Create table with inferred schema
      const columnDefinitions = columnDefs
        .map((col) => `"${col.name}" ${col.type}`)
        .join(', ')
      await connection.run(
        `CREATE TABLE ${sanitizedTableName} (${columnDefinitions})`,
      )

      // Insert data row by row (DuckDB doesn't have a direct JSON import, so we insert row by row)
      // For better performance with large datasets, we could batch inserts, but for now this is fine
      for (const row of flattenedData) {
        const values = columnDefs.map((col) => {
          const value = row?.[col.originalName]
          return escapeSQLString(value)
        })

        const insertQuery = `INSERT INTO ${sanitizedTableName} (${columnDefs.map((c) => `"${c.name}"`).join(', ')}) VALUES (${values.join(', ')})`
        await connection.run(insertQuery)
      }

      console.log(
        `Successfully created table: ${sanitizedTableName} with ${flattenedData.length} rows (from ${jsonData.length} original items)`,
      )

      // Get table info
      const result = await connection.run(
        `SELECT COUNT(*) as row_count FROM ${sanitizedTableName}`,
      )
      const rows = await result.getRows()

      connection.closeSync()

      // Extract row count from the result
      const rowCount =
        rows.length > 0 && Array.isArray(rows[0]) ? (rows[0][0] as number) : 0

      return {
        success: true,
        tableName: sanitizedTableName,
        rowCount,
        columnCount: columnDefs.length,
      }
    } catch (error) {
      console.error('Error creating table from JSON:', error)
      throw error
    }
  })
