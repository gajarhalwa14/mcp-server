import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/**
 * Creates and returns a StdioServerTransport for MCP communication over stdin/stdout.
 *
 * This transport is suitable for:
 * - Local development
 * - Claude Desktop integration
 * - MCP Inspector
 *
 * All application logs must go to stderr only; the logger utility already enforces this
 * to avoid corrupting the JSON-RPC framing on stdout.
 */
export function createStdioTransport(): StdioServerTransport {
  return new StdioServerTransport();
}
