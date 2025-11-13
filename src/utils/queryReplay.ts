import { queryDuckDB } from './duckdb'

export type QueryLog = {
  _id: string
  _creationTime: number
  query: string
  executedAt: number
  userId: string
  tableName: string
  success: boolean
  error?: string
  sequenceNumber: number
  resultMetadata?: {
    rowCount?: number
    columnCount?: number
    executionTimeMs?: number
  }
}

export type ReplayResult = {
  sequenceNumber: number
  query: string
  success: boolean
  error?: string
  executionTimeMs?: number
}

export type ReplaySummary = {
  totalQueries: number
  successCount: number
  failureCount: number
  results: ReplayResult[]
}

/**
 * Replay queries up to a specific sequence number
 * This will execute all queries in order to recreate the DuckDB state
 */
export async function replayQueriesUpTo(
  tableName: string,
  sequenceNumber: number,
  getQueryLogsUpTo: (args: {
    tableName: string
    sequenceNumber: number
  }) => Promise<QueryLog[]>,
): Promise<ReplaySummary> {
  const logs = await getQueryLogsUpTo({ tableName, sequenceNumber })

  const results: ReplayResult[] = []
  let successCount = 0
  let failureCount = 0

  // Execute queries in sequence
  for (const log of logs) {
    if (!log.success) {
      // Skip queries that originally failed
      results.push({
        sequenceNumber: log.sequenceNumber,
        query: log.query,
        success: false,
        error: 'Original query failed, skipping replay',
      })
      failureCount++
      continue
    }

    try {
      const startTime = Date.now()
      await queryDuckDB({ data: log.query })
      const executionTime = Date.now() - startTime

      results.push({
        sequenceNumber: log.sequenceNumber,
        query: log.query,
        success: true,
        executionTimeMs: executionTime,
      })
      successCount++
    } catch (error) {
      results.push({
        sequenceNumber: log.sequenceNumber,
        query: log.query,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failureCount++
    }
  }

  return {
    totalQueries: logs.length,
    successCount,
    failureCount,
    results,
  }
}

/**
 * Replay all queries (full database recreation)
 */
export async function replayAllQueries(
  tableName: string,
  getQueryLogs: (args?: {
    tableName?: string
    limit?: number
  }) => Promise<QueryLog[]>,
): Promise<ReplaySummary> {
  const logs = await getQueryLogs({ tableName, limit: 10000 })

  const results: ReplayResult[] = []
  let successCount = 0
  let failureCount = 0

  // Execute queries in sequence
  for (const log of logs) {
    if (!log.success) {
      // Skip queries that originally failed
      results.push({
        sequenceNumber: log.sequenceNumber,
        query: log.query,
        success: false,
        error: 'Original query failed, skipping replay',
      })
      failureCount++
      continue
    }

    try {
      const startTime = Date.now()
      await queryDuckDB({ data: log.query })
      const executionTime = Date.now() - startTime

      results.push({
        sequenceNumber: log.sequenceNumber,
        query: log.query,
        success: true,
        executionTimeMs: executionTime,
      })
      successCount++
    } catch (error) {
      results.push({
        sequenceNumber: log.sequenceNumber,
        query: log.query,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failureCount++
    }
  }

  return {
    totalQueries: logs.length,
    successCount,
    failureCount,
    results,
  }
}

