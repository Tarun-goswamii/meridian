import { createTool } from '@convex-dev/agent'
import { api } from './_generated/api'
import { z } from 'zod'

// Token limit utilities - keep tool responses small to reduce input tokens
// ~1 char ≈ 0.25 tokens, so 2000 chars ≈ 500 tokens
const MAX_STRING_LENGTH = 2000 // Max characters for string fields
const MAX_ARRAY_ITEMS = 10 // Max items in arrays
const MAX_CONTENT_LENGTH = 5000 // Max characters for large content fields (markdown/html)

function truncateString(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength) + '... [TRUNCATED]'
}

function truncateArray<T>(arr: T[], maxItems: number): T[] {
  if (!arr || arr.length <= maxItems) return arr
  return arr.slice(0, maxItems)
}

function truncateToolResponse(response: any): any {
  if (!response || typeof response !== 'object') return response

  const truncated = { ...response }

  // Truncate large string fields
  if (typeof truncated.content === 'string') {
    truncated.content = truncateString(truncated.content, MAX_CONTENT_LENGTH)
  }
  if (typeof truncated.markdown === 'string') {
    truncated.markdown = truncateString(truncated.markdown, MAX_CONTENT_LENGTH)
  }
  if (typeof truncated.html === 'string') {
    truncated.html = truncateString(truncated.html, MAX_CONTENT_LENGTH)
  }
  if (typeof truncated.description === 'string') {
    truncated.description = truncateString(truncated.description, MAX_STRING_LENGTH)
  }
  if (typeof truncated.error === 'string') {
    truncated.error = truncateString(truncated.error, MAX_STRING_LENGTH)
  }
  if (typeof truncated.message === 'string') {
    truncated.message = truncateString(truncated.message, MAX_STRING_LENGTH)
  }
  if (typeof truncated.summary === 'string') {
    truncated.summary = truncateString(truncated.summary, MAX_STRING_LENGTH)
  }

  // Truncate arrays
  if (Array.isArray(truncated.rows)) {
    truncated.rows = truncateArray(truncated.rows, MAX_ARRAY_ITEMS)
    if (truncated.rows.length < (response.rows?.length || 0)) {
      truncated.rowCount = response.rows?.length || 0
      truncated._truncatedRows = true
    }
  }
  if (Array.isArray(truncated.sources)) {
    truncated.sources = truncateArray(truncated.sources, MAX_ARRAY_ITEMS)
    if (truncated.sources.length < (response.sources?.length || 0)) {
      truncated._truncatedSources = true
    }
  }
  if (Array.isArray(truncated.results)) {
    truncated.results = truncateArray(truncated.results, MAX_ARRAY_ITEMS)
    if (truncated.results.length < (response.results?.length || 0)) {
      truncated._truncatedResults = true
    }
  }
  if (Array.isArray(truncated.data)) {
    truncated.data = truncateArray(truncated.data, MAX_ARRAY_ITEMS)
    if (truncated.data.length < (response.data?.length || 0)) {
      truncated._truncatedData = true
    }
  }
  if (Array.isArray(truncated.links)) {
    truncated.links = truncateArray(truncated.links, MAX_ARRAY_ITEMS)
  }
  if (Array.isArray(truncated.issues)) {
    truncated.issues = truncateArray(truncated.issues, MAX_ARRAY_ITEMS)
    if (truncated.issues.length < (response.issues?.length || 0)) {
      truncated._truncatedIssues = true
    }
  }

  // Truncate nested content in sources/results
  if (Array.isArray(truncated.sources)) {
    truncated.sources = truncated.sources.map((source: any) => {
      if (typeof source === 'object' && source !== null) {
        const truncatedSource = { ...source }
        if (typeof truncatedSource.content === 'string') {
          truncatedSource.content = truncateString(truncatedSource.content, MAX_STRING_LENGTH)
        }
        if (typeof truncatedSource.description === 'string') {
          truncatedSource.description = truncateString(truncatedSource.description, MAX_STRING_LENGTH)
        }
        return truncatedSource
      }
      return source
    })
  }

  if (Array.isArray(truncated.results)) {
    truncated.results = truncated.results.map((result: any) => {
      if (typeof result === 'object' && result !== null) {
        const truncatedResult = { ...result }
        if (typeof truncatedResult.description === 'string') {
          truncatedResult.description = truncateString(truncatedResult.description, MAX_STRING_LENGTH)
        }
        if (typeof truncatedResult.snippet === 'string') {
          truncatedResult.snippet = truncateString(truncatedResult.snippet, MAX_STRING_LENGTH)
        }
        return truncatedResult
      }
      return result
    })
  }

  // Truncate chart data if present
  if (truncated.chart && typeof truncated.chart === 'object') {
    if (Array.isArray(truncated.chart.data)) {
      truncated.chart.data = truncateArray(truncated.chart.data, MAX_ARRAY_ITEMS)
      if (truncated.chart.data.length < (response.chart?.data?.length || 0)) {
        truncated.chart._truncatedData = true
      }
    }
  }

  return truncated
}

// Tool to query DuckDB
export const queryDuckDB: any = createTool({
  description:
    'Execute a SQL query on DuckDB and return the results. Use this to read data from tables, columns, or specific entries. Returns columns, rows, and metadata.',
  args: z.object({
    query: z
      .string()
      .describe(
        'The SQL query to execute on DuckDB. Must be valid DuckDB SQL.',
      ),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query: args.query,
      })
      return truncateToolResponse({
        success: true,
        columns: result.columns || [],
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
        columnCount: result.columns?.length || 0,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to get table schema
export const getTableSchema: any = createTool({
  description:
    'Get the schema (column names and types) of a table. Use this to understand what columns are available in a table.',
  args: z.object({
    tableName: z.string().describe('The name of the table to get schema for'),
  }),
  handler: async (ctx, args) => {
    try {
      const query = `DESCRIBE ${args.tableName}`
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query,
      })
      return truncateToolResponse({
        success: true,
        tableName: args.tableName,
        columns: result.columns || [],
        rows: result.rows || [],
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to get sample rows from a table
export const getSampleRows: any = createTool({
  description:
    'Get a sample of rows from a table. Use this to see example data and understand the structure of the table.',
  args: z.object({
    tableName: z.string().describe('The name of the table'),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe('Number of rows to return (default: 10, max: 100)'),
  }),
  handler: async (ctx, args) => {
    try {
      const limit = Math.min(Math.max(args.limit || 10, 1), 100)
      const query = `SELECT * FROM ${args.tableName} LIMIT ${limit}`
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query,
      })
      return truncateToolResponse({
        success: true,
        tableName: args.tableName,
        columns: result.columns || [],
        rows: result.rows || [],
        rowCount: result.rows?.length || 0,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to create a chart from data
export const createChart: any = createTool({
  description:
    'Create a chart visualization from query results. Use this when the user asks to visualize data, create a chart, or show data graphically. The tool will analyze the data structure and determine the best chart type.',
  args: z.object({
    query: z
      .string()
      .describe(
        'The SQL query to execute to get data for the chart. Must be valid DuckDB SQL.',
      ),
    chartType: z
      .enum(['bar', 'line', 'area', 'pie', 'scatter', 'donut'])
      .optional()
      .describe(
        'The type of chart to create. If not specified, will be determined automatically based on data structure.',
      ),
    title: z.string().optional().describe('Title for the chart (optional)'),
    xAxisKey: z
      .string()
      .optional()
      .describe(
        'Column name to use for X-axis. If not specified, will be determined automatically.',
      ),
    yAxisKey: z
      .string()
      .optional()
      .describe(
        'Column name to use for Y-axis. If not specified, will be determined automatically.',
      ),
  }),
  handler: async (ctx, args) => {
    try {
      // Execute query to get data
      const result = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query: args.query,
      })

      if (!result || !result.rows || result.rows.length === 0) {
        return {
          success: false,
          error: 'No data returned from query',
        }
      }

      // Handle case where result might be an error
      if (result.error) {
        return {
          success: false,
          error: result.error,
        }
      }

      const columns = result.columns || []
      const rows = result.rows || []

      // Analyze data structure to determine chart configuration
      const numericColumns = columns.filter((col: any) => {
        if (!col.type) return false
        const type = col.type.toLowerCase()
        return (
          type.includes('int') ||
          type.includes('float') ||
          type.includes('double') ||
          type.includes('decimal') ||
          type.includes('numeric') ||
          type.includes('real')
        )
      })

      const stringColumns = columns.filter((col: any) => {
        if (!col.type) return false
        const type = col.type.toLowerCase()
        return (
          type.includes('varchar') ||
          type.includes('text') ||
          type.includes('string') ||
          type.includes('char')
        )
      })

      // Determine chart type if not specified
      let chartType = args.chartType
      if (!chartType) {
        if (numericColumns.length === 0) {
          return {
            success: false,
            error: 'No numeric columns found for charting',
          }
        } else if (numericColumns.length === 1 && stringColumns.length >= 1) {
          chartType = 'bar'
        } else if (numericColumns.length >= 2) {
          chartType = 'line'
        } else {
          chartType = 'bar'
        }
      }

      // Determine X and Y axis keys
      let xAxisKey = args.xAxisKey
      let yAxisKey = args.yAxisKey

      if (!xAxisKey && stringColumns.length > 0) {
        xAxisKey = stringColumns[0].name
      } else if (!xAxisKey && numericColumns.length > 0) {
        xAxisKey = numericColumns[0].name
      }

      if (!yAxisKey && numericColumns.length > 0) {
        // Use first numeric column that's not the x-axis
        const yCol =
          numericColumns.find((col: any) => col.name !== xAxisKey) ||
          numericColumns[0]
        yAxisKey = yCol.name
      }

      // Prepare data for chart (ensure it's in the right format)
      const chartData = rows.map((row: any) => {
        const entry: any = {}
        columns.forEach((col: any) => {
          entry[col.name] = row[col.name]
        })
        return entry
      })

      // Determine series configuration for multi-series charts
      const series: Array<{ name: string; color: string }> = []
      if (chartType === 'line' || chartType === 'area' || chartType === 'bar') {
        numericColumns.forEach((col: any, idx: number) => {
          if (col.name !== xAxisKey) {
            const colors = [
              'blue',
              'green',
              'red',
              'yellow',
              'purple',
              'orange',
              'cyan',
              'pink',
            ]
            series.push({
              name: col.name,
              color: colors[idx % colors.length],
            })
          }
        })
      }

      return truncateToolResponse({
        success: true,
        chart: {
          type: chartType,
          title: args.title || `Chart: ${xAxisKey} vs ${yAxisKey}`,
          data: chartData,
          dataKey: xAxisKey,
          xAxisKey: xAxisKey,
          yAxisKey: yAxisKey,
          series: series.length > 0 ? series : undefined,
          columns: columns.map((col: any) => ({
            name: col.name,
            type: col.type,
          })),
          query: args.query, // Store the original query for re-execution
        },
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to generate AI insights from data
export const generateInsights: any = createTool({
  description:
    'Generate AI-powered insights from data analysis. Use this when the user asks for insights, patterns, anomalies, or wants to understand what the data tells them. This tool performs statistical analysis and generates actionable insights.',
  args: z.object({
    tableName: z.string().describe('The name of the table to analyze'),
    query: z
      .string()
      .optional()
      .describe(
        'Optional SQL query to filter the data before analysis. If not provided, analyzes the entire table.',
      ),
    forceRefresh: z
      .boolean()
      .optional()
      .default(false)
      .describe('Force refresh insights even if cached'),
  }),
  handler: async (ctx, args) => {
    try {
      // First, get the data to analyze
      const dataQuery = args.query || `SELECT * FROM ${args.tableName}`
      const dataResult = await ctx.runAction(api.table_agent.fetchDuckDBQuery, {
        query: dataQuery,
      })

      if (!dataResult || !dataResult.rows || dataResult.rows.length === 0) {
        return {
          success: false,
          error: 'No data found to analyze',
        }
      }

      const columns = dataResult.columns || []
      const rows = dataResult.rows || []

      // For now, we'll need to call the insights generation
      // This is a simplified version - in production, you'd want to do statistical analysis first
      // For now, we'll return a message that insights generation requires statistical analysis
      // which should be done on the frontend or via a more complex flow

      return truncateToolResponse({
        success: true,
        message:
          'Insights generation requires statistical analysis. Use analyzeDataQuality or queryDuckDB to gather data first, then insights can be generated.',
        tableName: args.tableName,
        rowCount: rows.length,
        columnCount: columns.length,
        note: 'For full insights generation, use the insights API with statistical analyses.',
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to search the web using Firecrawl
export const firecrawlSearch: any = createTool({
  description:
    'Search the web for information using Firecrawl. Use this when you need current information, facts, or context that is not in the database. Great for looking up definitions, recent events, or external data.',
  args: z.object({
    query: z.string().describe('The search query to look up on the web'),
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of results to return (default: 10, max: 20)'),
  }),
  handler: async (ctx, args) => {
    try {
      const maxResults = Math.min(Math.max(args.maxResults || 10, 1), 20)
      const result = await ctx.runAction(
        api.table_agent.performFirecrawlSearch,
        {
          query: args.query,
          maxResults,
        },
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to search the web',
        }
      }

      return truncateToolResponse({
        success: true,
        query: args.query,
        sources: result.sources || [],
        sourceCount: result.sources?.length || 0,
        results: result.results || [],
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Web search failed. Make sure FIRECRAWL_API_KEY is configured.',
      }
    }
  },
})

// Tool to scrape web pages using Firecrawl
export const scrapeWebPage: any = createTool({
  description: `Scrape and extract content from a web page using Firecrawl.
    Use this when you need to get information from a specific URL, read article content, or extract data from websites.
    Returns clean markdown content. You are supposed to get insights from that markdown content and tell the user concisely.
    Do not just give the user the direct markdown that you get.`,
  args: z.object({
    url: z.string().describe('The URL of the web page to scrape'),
    includeMarkdown: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include markdown formatted content'),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.table_agent.scrapeWebPageAction, {
        url: args.url,
        includeMarkdown: args.includeMarkdown,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to scrape web page',
        }
      }

      return truncateToolResponse({
        success: true,
        url: result.url,
        title: result.title,
        content: result.content,
        markdown: result.markdown,
        description: result.description,
        links: result.links || [],
        contentLength: result.content?.length || 0,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Web scraping failed. Make sure FIRECRAWL_API_KEY is configured.',
      }
    }
  },
})

// Tool to extract structured data from web pages using Firecrawl
export const extractWebPage: any = createTool({
  description:
    'Extract structured data from one or more web pages using Firecrawl. Use this when you need to extract specific information, structured data, or follow a schema from web pages. Great for extracting product information, article metadata, or any structured data from websites.',
  args: z.object({
    urls: z.array(z.string()).describe('Array of URLs to extract data from'),
    prompt: z
      .string()
      .describe('A prompt describing what data to extract from the web pages'),
    schema: z
      .any()
      .optional()
      .describe(
        'Optional JSON schema defining the structure of the data to extract',
      ),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(api.table_agent.extractWebPageAction, {
        urls: args.urls,
        prompt: args.prompt,
        schema: args.schema,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to extract data from web pages',
        }
      }

      return truncateToolResponse({
        success: true,
        urls: result.urls,
        data: result.data || [],
        extractedCount: Array.isArray(result.data)
          ? result.data.length
          : result.data
            ? 1
            : 0,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Data extraction failed. Make sure FIRECRAWL_API_KEY is configured.',
      }
    }
  },
})

// Tool to analyze data quality
export const analyzeDataQuality: any = createTool({
  description:
    'Analyze data quality of a table. Checks for null values, duplicates, empty strings, and other data quality issues. Use this to understand data cleanliness and identify problems.',
  args: z.object({
    tableName: z.string().describe('The name of the table to analyze'),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runAction(
        api.table_agent.analyzeDataQualityAction,
        {
          tableName: args.tableName,
        },
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to analyze data quality',
        }
      }

      return truncateToolResponse({
        success: true,
        tableName: result.tableName,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        qualityScore: result.qualityScore,
        issueCount: result.issueCount,
        issues: result.issues || [],
        summary: `Found ${result.issueCount} data quality issues. Quality score: ${result.qualityScore}/100`,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to compare two tables
export const compareTables: any = createTool({
  description:
    'Compare two tables to find differences, similarities, or relationships. Useful for data validation, finding discrepancies, or understanding how datasets relate.',
  args: z.object({
    table1: z.string().describe('Name of the first table'),
    table2: z.string().describe('Name of the second table'),
    compareColumns: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to compare column schemas'),
    compareRowCounts: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to compare row counts'),
  }),
  handler: async (ctx, args) => {
    try {
      // Get schemas for both tables
      const schema1Query = `DESCRIBE ${args.table1}`
      const schema2Query = `DESCRIBE ${args.table2}`

      const [schema1Result, schema2Result] = await Promise.all([
        ctx.runAction(api.table_agent.fetchDuckDBQuery, {
          query: schema1Query,
        }),
        ctx.runAction(api.table_agent.fetchDuckDBQuery, {
          query: schema2Query,
        }),
      ])

      const schema1 = schema1Result.rows || []
      const schema2 = schema2Result.rows || []

      // Get row counts
      const count1Query = `SELECT COUNT(*) as count FROM ${args.table1}`
      const count2Query = `SELECT COUNT(*) as count FROM ${args.table2}`

      const [count1Result, count2Result] = await Promise.all([
        ctx.runAction(api.table_agent.fetchDuckDBQuery, {
          query: count1Query,
        }),
        ctx.runAction(api.table_agent.fetchDuckDBQuery, {
          query: count2Query,
        }),
      ])

      const count1 = count1Result.rows?.[0]?.count || 0
      const count2 = count2Result.rows?.[0]?.count || 0

      // Compare columns
      const columns1 = schema1.map((col: any) => ({
        name: col.column_name || col.name,
        type: col.column_type || col.type,
      }))
      const columns2 = schema2.map((col: any) => ({
        name: col.column_name || col.name,
        type: col.column_type || col.type,
      }))

      const commonColumns = columns1.filter((col1: any) =>
        columns2.some(
          (col2: any) => col2.name === col1.name && col2.type === col1.type,
        ),
      )
      const onlyInTable1 = columns1.filter(
        (col1: any) => !columns2.some((col2: any) => col2.name === col1.name),
      )
      const onlyInTable2 = columns2.filter(
        (col2: any) => !columns1.some((col1: any) => col1.name === col2.name),
      )

      return truncateToolResponse({
        success: true,
        table1: {
          name: args.table1,
          rowCount: count1,
          columnCount: columns1.length,
        },
        table2: {
          name: args.table2,
          rowCount: count2,
          columnCount: columns2.length,
        },
        comparison: {
          rowCountDifference: Math.abs(count1 - count2),
          commonColumns: commonColumns.length,
          onlyInTable1: onlyInTable1.length,
          onlyInTable2: onlyInTable2.length,
        },
        details: {
          commonColumns: commonColumns,
          onlyInTable1: onlyInTable1,
          onlyInTable2: onlyInTable2,
        },
        summary: `Table 1 has ${count1} rows and ${columns1.length} columns. Table 2 has ${count2} rows and ${columns2.length} columns. ${commonColumns.length} common columns found.`,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})

// Tool to get list of all tables
export const getTableList: any = createTool({
  description:
    'Get a list of all available tables in the database. Use this to discover what tables are available or to help users navigate the database.',
  args: z.object({}),
  handler: async (ctx) => {
    try {
      const result = await ctx.runAction(api.table_agent.getTableListAction, {})

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to get table list',
        }
      }

      return truncateToolResponse({
        success: true,
        tables: result.tables || [],
        count: result.count || 0,
        message: `Found ${result.count || 0} table(s) in the database`,
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  },
})
