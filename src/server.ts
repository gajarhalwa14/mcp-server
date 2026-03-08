import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, type AppConfig } from "./config/env.js";
import { createLogger } from "./utils/logger.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";
import {
  createTransport,
  startHttpTransport,
  type HttpServer
} from "./transport/index.js";

export interface ServerHandle {
  close(): Promise<void>;
}

/**
 * Creates an McpServer instance with tools, resources, and prompts registered.
 */
function createMcpServer(config: AppConfig) {
  const logger = createLogger(config.logLevel);
  const server = new McpServer(
    {
      name: "mcp-server",
      version: "1.0.0"
    },
    { capabilities: { logging: {} } }
  );

  registerTools(server, config, logger);
  registerResources(server, config);
  registerPrompts(server);

  return { server, logger };
}

/**
 * Starts the MCP server with the chosen transport.
 *
 * - stdio: Connects to StdioServerTransport for local/Claude Desktop/MCP Inspector.
 * - http: Starts HTTP server with Streamable HTTP transport.
 *
 * Exits early with clear logs on configuration errors.
 * Unexpected exceptions are caught and logged.
 *
 * @returns For HTTP mode, returns a handle with close() to shut down the server.
 *          For STDIO mode, returns undefined (process runs until exit).
 */
export async function start(
  env: NodeJS.ProcessEnv = process.env
): Promise<ServerHandle | undefined> {
  let config;
  try {
    config = loadConfig(env);
  } catch (error) {
    console.error(
      "Failed to start MCP server due to invalid configuration:",
      error
    );
    throw error;
  }

  const { server, logger } = createMcpServer(config);

  try {
    if (config.transport === "stdio") {
      const transport = createTransport(config, logger);
      await server.connect(transport);
      logger.info("MCP server running in STDIO mode");
      return undefined;
    }

    const getServer = (): McpServer => {
      const { server: s } = createMcpServer(config);
      return s;
    };
    const httpServer: HttpServer = await startHttpTransport(
      getServer,
      config,
      logger
    );
    logger.info("MCP server running in HTTP mode", { port: config.port });
    return httpServer;
  } catch (error) {
    logger.error("Failed to start transport", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  const entry = resolve(process.argv[1]);
  const self = fileURLToPath(import.meta.url);
  return entry === self;
}

if (isMainModule()) {
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });

  start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
