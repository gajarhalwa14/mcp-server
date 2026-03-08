import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG_RESOURCE_URI } from "../config/constants.js";
import { getServerConfigContent } from "./server-config.js";
import {
  introspectSqliteSchema,
  formatSchemaAsText
} from "./sqlite-schema.js";
import type { AppConfig } from "../config/env.js";

export function registerResources(
  server: McpServer,
  config: AppConfig
): void {
  server.registerResource(
    "server-config",
    CONFIG_RESOURCE_URI,
    {
      title: "Server Configuration",
      description:
        "Non-sensitive server configuration (transport, limits, allowed directories)",
      mimeType: "application/json"
    },
    async (uri) => {
      const content = getServerConfigContent(config);
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: content
          }
        ]
      };
    }
  );

  const sqliteTemplate = new ResourceTemplate(
    "schema://sqlite/{+db_path}",
    {
      list: undefined,
      complete: undefined
    }
  );

  server.registerResource(
    "sqlite-schema",
    sqliteTemplate,
    {
      title: "SQLite Schema",
      description:
        "Introspects table and column schema of a SQLite database to help write query_sqlite calls",
      mimeType: "text/plain"
    },
    async (uri, variables) => {
      const dbPathRaw = variables.db_path;
      if (typeof dbPathRaw !== "string" || !dbPathRaw) {
        throw new Error("Missing or invalid db_path variable");
      }

      const dbPath = decodeURIComponent(dbPathRaw);
      const schema = introspectSqliteSchema(dbPath, config);
      const text = formatSchemaAsText(schema);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/plain",
            text
          }
        ]
      };
    }
  );
}
