"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { type Id } from "../_generated/dataModel";
import { checkAuth } from "../authFns";
import { api } from "../_generated/api";
import Firecrawl from "@mendable/firecrawl-js";

// Helper function to generate a simple schema from prompt (without using agent)
// This helps Firecrawl extract more structured data
function generateSimpleSchema(prompt: string): any {
  const promptLower = prompt.toLowerCase();

  // Common patterns to detect
  const schema: any = {
    type: "object",
    properties: {},
  };

  // Detect common fields from prompt keywords
  if (
    promptLower.includes("job") ||
    promptLower.includes("position") ||
    promptLower.includes("role")
  ) {
    schema.properties = {
      title: { type: "string", description: "Job title or position name" },
      company: { type: "string", description: "Company name" },
    };
    if (promptLower.includes("location") || promptLower.includes("city")) {
      schema.properties.location = {
        type: "string",
        description: "Job location",
      };
    }
    if (
      promptLower.includes("salary") ||
      promptLower.includes("pay") ||
      promptLower.includes("compensation")
    ) {
      schema.properties.salary = {
        type: "string",
        description: "Salary or compensation",
      };
    }
  } else if (promptLower.includes("product")) {
    schema.properties = {
      name: { type: "string", description: "Product name" },
      price: { type: "string", description: "Product price" },
      description: { type: "string", description: "Product description" },
    };
  } else if (promptLower.includes("article") || promptLower.includes("post")) {
    schema.properties = {
      title: { type: "string", description: "Article title" },
      author: { type: "string", description: "Author name" },
      date: { type: "string", description: "Publication date" },
      content: { type: "string", description: "Article content or summary" },
    };
  } else if (promptLower.includes("event")) {
    schema.properties = {
      name: { type: "string", description: "Event name" },
      date: { type: "string", description: "Event date" },
      location: { type: "string", description: "Event location" },
    };
  }

  // If we detected a list/array pattern, wrap in array
  if (
    promptLower.includes("list") ||
    promptLower.includes("all") ||
    promptLower.includes("each")
  ) {
    return {
      type: "array",
      items: schema,
    };
  }

  // Default: return array of objects
  return {
    type: "array",
    items:
      schema.type === "object"
        ? schema
        : { type: "object", properties: schema.properties || {} },
  };
}

// Action to extract data from URL using Firecrawl and return JSON data
export const createTableFromURL = action({
  args: {
    url: v.string(),
    prompt: v.string(),
    tableName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: true;
    fileId: Id<"files">;
    data: any[];
    tableName: string;
    rowCount: number;
    columnCount: number;
  }> => {
    await checkAuth(ctx);
    const apiKey = (globalThis as any).process?.env?.FIRECRAWL_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Firecrawl API key not configured. Set FIRECRAWL_API_KEY environment variable."
      );
    }

    try {
      // Generate a simple schema from the prompt to help Firecrawl extract better structured data
      const schema = generateSimpleSchema(args.prompt);

      // Use Firecrawl to extract structured data from the URL
      const firecrawl = new Firecrawl({ apiKey });
      const extractResult = await firecrawl.extract({
        urls: [args.url],
        prompt: args.prompt,
        schema:
          schema.properties && Object.keys(schema.properties).length > 0
            ? schema
            : undefined,
      });

      if (!extractResult.data) {
        throw new Error("No data extracted from URL");
      }

      // Convert extracted data to array format
      const extractedData = Array.isArray(extractResult.data)
        ? extractResult.data
        : [extractResult.data];

      if (extractedData.length === 0) {
        throw new Error("No data extracted from URL");
      }

      // Generate table name from URL if not provided
      const tableName =
        args.tableName ||
        args.url
          .replace(/^https?:\/\//, "")
          .replace(/[^a-zA-Z0-9]/g, "_")
          .toLowerCase()
          .slice(0, 50) ||
        "extracted_table";

      // Sanitize table name
      const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, "_");

      const jsonContent = JSON.stringify(extractedData, null, 2);

      const fileName = `${sanitizedTableName}.json`;
      const fileId = await ctx.runMutation(api.csv.saveFile, {
        fileName,
        fileType: "application/json",
        fileSize: jsonContent.length,
        fileContent: jsonContent,
      });

      return {
        success: true,
        fileId,
        data: extractedData, // Return the JSON data directly
        tableName: sanitizedTableName,
        rowCount: extractedData.length,
        columnCount: extractedData[0]
          ? Object.keys(extractedData[0]).length
          : 0,
      };
    } catch (error) {
      console.error("Error extracting data from URL:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to extract data from URL");
    }
  },
});
