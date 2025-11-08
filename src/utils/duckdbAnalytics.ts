import { queryDuckDBAnalytics } from './duckdb'

export type ColumnAnalysis = {
  columnName: string
  columnType: string
  hasNumericData: boolean
  stats?: {
    mean: number
    median: number
    stdDev: number
    min: number
    max: number
    q1: number
    q3: number
    iqr: number
    count: number
  }
  outliers?: Array<{ value: number; zScore: number }>
  topPerformers?: Array<{ value: number }>
  bottomPerformers?: Array<{ value: number }>
  timeTrend?: {
    trend: 'increasing' | 'decreasing' | 'stable'
    avgChangePercent: number
    totalChangePercent: number
  }
}

// Helper to sanitize column names for SQL
function sanitizeColumnName(name: string): string {
  // If column name contains spaces or special chars, quote it
  if (/[^a-zA-Z0-9_]/.test(name)) {
    return `"${name.replace(/"/g, '""')}"`
  }
  return name
}

// Check if a column type is numeric
function isNumericType(type: string): boolean {
  const numericTypes = [
    'INTEGER',
    'BIGINT',
    'DOUBLE',
    'FLOAT',
    'DECIMAL',
    'NUMERIC',
    'TINYINT',
    'SMALLINT',
    'REAL',
  ]
  return numericTypes.some((t) => type.toUpperCase().includes(t))
}

// Analyze a single numeric column using DuckDB queries
export async function analyzeColumnWithDuckDB(
  tableName: string,
  baseQuery: string,
  column: { name: string; type: string },
): Promise<ColumnAnalysis> {
  const sanitizedTable = tableName.replace(/[^a-zA-Z0-9_]/g, '_')
  const sanitizedCol = sanitizeColumnName(column.name)

  // Check if column is numeric
  if (!isNumericType(column.type)) {
    return {
      columnName: column.name,
      columnType: column.type,
      hasNumericData: false,
    }
  }

  try {
    // Use CTE to wrap the base query
    // If baseQuery is a full SELECT statement, use it; otherwise query the table directly
    const isSelectQuery = baseQuery.trim().toUpperCase().startsWith('SELECT')
    const dataQuery = isSelectQuery
      ? baseQuery
      : `SELECT * FROM ${sanitizedTable}`

    // Basic statistics query using DuckDB functions
    const statsQuery = `
      WITH data AS (${dataQuery})
      SELECT 
        AVG(${sanitizedCol}) as mean,
        MEDIAN(${sanitizedCol}) as median,
        STDDEV_POP(${sanitizedCol}) as stddev,
        MIN(${sanitizedCol}) as min,
        MAX(${sanitizedCol}) as max,
        QUANTILE_CONT(${sanitizedCol}, 0.25) as q1,
        QUANTILE_CONT(${sanitizedCol}, 0.75) as q3,
        COUNT(*) as count
      FROM data
      WHERE ${sanitizedCol} IS NOT NULL
    `

    const statsResult = await queryDuckDBAnalytics({ data: statsQuery })

    if (
      !statsResult.rows ||
      statsResult.rows.length === 0 ||
      statsResult.rows[0].count === 0
    ) {
      return {
        columnName: column.name,
        columnType: column.type,
        hasNumericData: false,
      }
    }

    const statsRow = statsResult.rows[0]
    const mean = statsRow.mean ?? 0
    const stdDev = statsRow.stddev ?? 0
    const median = statsRow.median ?? 0
    const min = statsRow.min ?? 0
    const max = statsRow.max ?? 0
    const q1 = statsRow.q1 ?? 0
    const q3 = statsRow.q3 ?? 0
    const count = statsRow.count ?? 0
    const iqr = q3 - q1

    const stats = {
      mean: Number(mean),
      median: Number(median),
      stdDev: Number(stdDev),
      min: Number(min),
      max: Number(max),
      q1: Number(q1),
      q3: Number(q3),
      iqr: Number(iqr),
      count: Number(count),
    }

    // Detect outliers (z-score > 2)
    let outliers: Array<{ value: number; zScore: number }> = []
    if (stdDev > 0) {
      const outliersQuery = `
        WITH data AS (${dataQuery}),
        stats AS (
          SELECT 
            AVG(${sanitizedCol}) as mean,
            STDDEV_POP(${sanitizedCol}) as stddev
          FROM data
          WHERE ${sanitizedCol} IS NOT NULL
        )
        SELECT 
          ${sanitizedCol} as value,
          ABS((${sanitizedCol} - stats.mean) / NULLIF(stats.stddev, 0)) as zscore
        FROM data, stats
        WHERE ${sanitizedCol} IS NOT NULL
          AND ABS((${sanitizedCol} - stats.mean) / NULLIF(stats.stddev, 0)) > 2
        ORDER BY zscore DESC
        LIMIT 10
      `

      try {
        const outliersResult = await queryDuckDBAnalytics({
          data: outliersQuery,
        })
        outliers = (outliersResult.rows || []).map((row: any) => ({
          value: Number(row.value),
          zScore: Number(row.zscore),
        }))
      } catch (err) {
        console.error('Error detecting outliers:', err)
      }
    }

    // Top and bottom performers
    let topPerformers: Array<{ value: number }> = []
    let bottomPerformers: Array<{ value: number }> = []

    try {
      const topQuery = `
        WITH data AS (${dataQuery})
        SELECT ${sanitizedCol} as value
        FROM data
        WHERE ${sanitizedCol} IS NOT NULL
        ORDER BY ${sanitizedCol} DESC
        LIMIT 5
      `
      const topResult = await queryDuckDBAnalytics({ data: topQuery })
      topPerformers = (topResult.rows || []).map((row: any) => ({
        value: Number(row.value),
      }))

      const bottomQuery = `
        WITH data AS (${dataQuery})
        SELECT ${sanitizedCol} as value
        FROM data
        WHERE ${sanitizedCol} IS NOT NULL
        ORDER BY ${sanitizedCol} ASC
        LIMIT 5
      `
      const bottomResult = await queryDuckDBAnalytics({ data: bottomQuery })
      bottomPerformers = (bottomResult.rows || []).map((row: any) => ({
        value: Number(row.value),
      }))
    } catch (err) {
      console.error('Error getting top/bottom performers:', err)
    }

    // Time trend detection (if column name suggests it's a time column)
    let timeTrend:
      | {
          trend: 'increasing' | 'decreasing' | 'stable'
          avgChangePercent: number
          totalChangePercent: number
        }
      | undefined
    const timeKeywords = [
      'date',
      'time',
      'timestamp',
      'created',
      'updated',
      'year',
      'month',
      'day',
    ]
    const isTimeColumn = timeKeywords.some((keyword) =>
      column.name.toLowerCase().includes(keyword),
    )

    if (isTimeColumn && count >= 2) {
      try {
        const trendQuery = `
          WITH data AS (${dataQuery}),
          ordered AS (
            SELECT ${sanitizedCol} as value,
                   ROW_NUMBER() OVER (ORDER BY ${sanitizedCol}) as rn
            FROM data
            WHERE ${sanitizedCol} IS NOT NULL
          ),
          changes AS (
            SELECT 
              curr.value as curr_val,
              prev.value as prev_val,
              CASE 
                WHEN prev.value != 0 THEN ((curr.value - prev.value) / prev.value * 100)
                ELSE 0
              END as pct_change
            FROM ordered curr
            JOIN ordered prev ON curr.rn = prev.rn + 1
          )
          SELECT 
            AVG(pct_change) as avg_change,
            (MAX(curr_val) - MIN(prev_val)) / NULLIF(MIN(prev_val), 0) * 100 as total_change
          FROM changes
        `
        const trendResult = await queryDuckDBAnalytics({ data: trendQuery })

        if (trendResult.rows && trendResult.rows.length > 0) {
          const avgChange = trendResult.rows[0].avg_change ?? 0
          const totalChange = trendResult.rows[0].total_change ?? 0

          timeTrend = {
            trend:
              avgChange > 5
                ? 'increasing'
                : avgChange < -5
                  ? 'decreasing'
                  : 'stable',
            avgChangePercent: Number(avgChange),
            totalChangePercent: Number(totalChange),
          }
        }
      } catch (err) {
        console.error('Error detecting time trends:', err)
      }
    }

    return {
      columnName: column.name,
      columnType: column.type,
      hasNumericData: true,
      stats,
      outliers: outliers.length > 0 ? outliers : undefined,
      topPerformers: topPerformers.length > 0 ? topPerformers : undefined,
      bottomPerformers:
        bottomPerformers.length > 0 ? bottomPerformers : undefined,
      timeTrend,
    }
  } catch (error) {
    console.error(`Error analyzing column ${column.name}:`, error)
    return {
      columnName: column.name,
      columnType: column.type,
      hasNumericData: false,
    }
  }
}

// Analyze all columns in a table using DuckDB
export async function analyzeTableWithDuckDB(
  tableName: string,
  query: string,
  columns: Array<{ name: string; type: string }>,
): Promise<ColumnAnalysis[]> {
  // Analyze columns in parallel
  const analyses = await Promise.all(
    columns.map((col) => analyzeColumnWithDuckDB(tableName, query, col)),
  )

  return analyses
}
