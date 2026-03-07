import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileHandler } from "./read-file.js";
import { querySqliteHandler } from "./query-sqlite.js";
import type { Logger } from "../utils/logger.js";
import type { AppConfig } from "../config/env.js";
import { toToolErrorInfo } from "../utils/errors.js";

export function registerTools(
  server: McpServer,
  config: AppConfig,
  logger: Logger
): void {
  server.registerTool(
    "read_file",
    {
      description:
        "Reads a file from the local filesystem and returns its contents as a UTF-8 string. Gives the AI grounded access to real files — configs, CSVs, logs, markdown docs, etc.",
      inputSchema: {
        path: z.string().describe("Absolute or relative path to the target file")
      }
    },
    async (args) => {
      try {
        const result = await readFileHandler(args, config, logger);
        return {
          content: [
            {
              type: "text",
              text: `Read ${result.size_bytes} bytes (${result.mime_type})`
            }
          ],
          structuredContent: {
            content: result.content,
            size_bytes: result.size_bytes,
            mime_type: result.mime_type
          }
        };
      } catch (e) {
        const info = toToolErrorInfo(e);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${info.message}`
            }
          ],
          structuredContent: { error: info.code, message: info.message },
          isError: true
        };
      }
    }
  );

  server.registerTool(
    "query_sqlite",
    {
      description:
        "Executes a read-only SQL query against a local SQLite database file. Returns result rows as a JSON array. Only SELECT statements are permitted.",
      inputSchema: {
        db_path: z.string().describe("Path to the SQLite database file"),
        sql: z.string().describe("SELECT statement to execute"),
        params: z
          .array(z.union([z.string(), z.number(), z.null()]))
          .optional()
          .describe("Optional query parameters for parameterized statements")
      }
    },
    async (args) => {
      try {
        const result = await querySqliteHandler(args, config, logger);
        return {
          content: [
            {
              type: "text",
              text: `Returned ${result.row_count} row(s)${result.truncated ? " (truncated)" : ""}`
            }
          ],
          structuredContent: {
            rows: result.rows,
            row_count: result.row_count,
            columns: result.columns,
            ...(result.truncated && { truncated: true })
          }
        };
      } catch (e) {
        const info = toToolErrorInfo(e);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${info.message}`
            }
          ],
          structuredContent: { error: info.code, message: info.message },
          isError: true
        };
      }
    }
  );
}
