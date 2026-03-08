import { Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "../config/env.js";
import type { Logger } from "../utils/logger.js";

/** Default rate limit: 100 requests per 15 minutes per IP */
const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 100;

/** Default CORS: allow all origins (sane default for development/API) */
const DEFAULT_CORS_ORIGIN = "*";

export interface HttpTransportOptions {
  config: AppConfig;
  logger: Logger;
  /** Allowed CORS origins; defaults to "*" */
  corsOrigins?: string | string[];
  /** Max requests per window for rate limiting; default 100 */
  rateLimitMax?: number;
  /** Rate limit window in ms; default 15 minutes */
  rateLimitWindowMs?: number;
}

export interface HttpServer {
  close(): Promise<void>;
}

/**
 * Creates and starts an HTTP server with Streamable HTTP transport.
 *
 * Uses StreamableHTTPServerTransport in stateless mode (sessionIdGenerator: undefined)
 * for simple API-style operation. Supports SSE streaming per MCP spec.
 *
 * - CORS: configurable allowlist or allow-all default
 * - Rate limiting: IP-based, configurable window and max requests
 * - DNS rebinding protection via createMcpExpressApp when binding to localhost
 */
export async function createAndStartHttpServer(
  getServer: () => McpServer,
  options: HttpTransportOptions
): Promise<HttpServer> {
  const {
    config,
    logger,
    corsOrigins = DEFAULT_CORS_ORIGIN,
    rateLimitMax = DEFAULT_RATE_LIMIT_MAX,
    rateLimitWindowMs = DEFAULT_RATE_LIMIT_WINDOW_MS
  } = options;

  const app = createMcpExpressApp({
    host: "0.0.0.0",
    allowedHosts: ["localhost", "127.0.0.1", "[::1]"]
  });

  app.use(
    cors({
      origin: corsOrigins,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "mcp-session-id"]
    })
  );

  app.use(
    rateLimit({
      windowMs: rateLimitWindowMs,
      max: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Rate limit exceeded. Please try again later."
        },
        id: null
      }
    })
  );

  const mcpPostHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const server = getServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        transport.close().catch((err) => {
          logger.warn("Error closing transport", { error: String(err) });
        });
      });
    } catch (error) {
      logger.error("Error handling MCP request", {
        error: error instanceof Error ? error.message : String(error)
      });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error"
          },
          id: null
        });
      }
    }
  };

  const mcpGetHandler = async (req: Request, res: Response): Promise<void> => {
    logger.info("Received GET /mcp - stateless mode does not support SSE streams");
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed. Stateless mode does not support SSE."
        },
        id: null
      })
    );
  };

  const mcpDeleteHandler = async (req: Request, res: Response): Promise<void> => {
    logger.info("Received DELETE /mcp - stateless mode has no sessions");
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed. Stateless mode has no sessions."
        },
        id: null
      })
    );
  };

  app.post("/mcp", mcpPostHandler);
  app.get("/mcp", mcpGetHandler);
  app.delete("/mcp", mcpDeleteHandler);

  const server = app.listen(config.port, () => {
    logger.info("MCP HTTP server listening", { port: config.port });
  });

  await new Promise<void>((resolve) => {
    server.on("listening", () => resolve());
  });

  return {
    async close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  };
}
