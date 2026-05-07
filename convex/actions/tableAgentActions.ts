"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import Firecrawl from "@mendable/firecrawl-js";

// Action to perform web search using Firecrawl
export const performFirecrawlSearch = action({
  args: { query: v.string(), maxResults: v.optional(v.number()) },
  handler: async (_, { query, maxResults = 10 }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable."
      );
    }

    try {
      const firecrawl = new Firecrawl({ apiKey });
      const result = await firecrawl.search(query, {
        limit: Math.min(maxResults, 20),
      });

      return {
        success: true,
        query,
        results: result.web || [],
        sources:
          result.web?.map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
            content: r.description || "",
          })) || [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Action to scrape web page using Firecrawl SDK
export const scrapeWebPageAction = action({
  args: { url: v.string(), includeMarkdown: v.optional(v.boolean()) },
  handler: async (_, { url, includeMarkdown = true }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable."
      );
    }

    try {
      const firecrawl = new Firecrawl({ apiKey });
      const result = await firecrawl.scrape(url, {
        formats: includeMarkdown ? ["markdown", "html"] : ["html"],
        onlyMainContent: true,
      });

      return {
        success: true,
        url,
        title: result.metadata?.title || "",
        markdown: result.markdown || "",
        html: result.html || "",
        content: result.markdown || result.html || "",
        description: result.metadata?.description || "",
        links: result.links || [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});

// Action to extract structured data from web pages using Firecrawl
export const extractWebPageAction = action({
  args: {
    urls: v.array(v.string()),
    prompt: v.string(),
    schema: v.optional(v.any()),
  },
  handler: async (_, { urls, prompt, schema }) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable."
      );
    }

    try {
      const firecrawl = new Firecrawl({ apiKey });
      const result = await firecrawl.extract({
        urls,
        prompt,
        schema: schema || undefined,
      });

      return {
        success: true,
        urls,
        data: result.data
          ? Array.isArray(result.data)
            ? result.data
            : [result.data]
          : [],
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
