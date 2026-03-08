import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../utils/logger.js";
import { createStdioTransport } from "./stdio.js";
import {
  createAndStartHttpServer,
  type HttpServer
} from "./http.js";

export type { HttpServer };

/**
 * Creates a STDIO transport for the given config.
 * Use with server.connect(transport) for local/Claude Desktop/MCP Inspector.
 */
export function createTransport(
  _config: AppConfig,
  _logger: Logger
): StdioServerTransport {
  return createStdioTransport();
}

/**
 * Starts the HTTP transport server. Returns a handle to close the server.
 * The getServer factory is called per request for stateless operation.
 */
export async function startHttpTransport(
  getServer: () => McpServer,
  config: AppConfig,
  logger: Logger
): Promise<HttpServer> {
  return createAndStartHttpServer(getServer, {
    config,
    logger
  });
}
