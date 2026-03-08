import { describe, it, expect, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAndStartHttpServer } from "../../src/transport/http.js";
import { createLogger } from "../../src/utils/logger.js";
import type { AppConfig } from "../../src/config/env.js";

const TEST_PORT = 39482;

function createTestConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    transport: "http",
    port: TEST_PORT,
    logLevel: "info",
    allowedDirs: ["/tmp"],
    maxFileBytes: 1024,
    sqliteMaxRows: 100,
    queryTimeoutMs: 5000,
    configResourceUri: "config://server",
    ...overrides
  };
}

describe("HTTP transport", () => {
  let httpServer: { close(): Promise<void> } | null = null;
  const logger = createLogger("info");

  afterEach(async () => {
    if (httpServer) {
      await httpServer.close();
      httpServer = null;
    }
  });

  it("starts and responds to POST /mcp with CORS headers", async () => {
    const config = createTestConfig({ port: TEST_PORT });
    const getServer = () =>
      new McpServer({ name: "test", version: "1.0.0" });

    httpServer = await createAndStartHttpServer(getServer, { config, logger });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" }
        }
      })
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.jsonrpc).toBe("2.0");
    expect(data.result?.serverInfo?.name).toBe("test");

    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("returns 405 for GET /mcp in stateless mode", async () => {
    const config = createTestConfig({ port: TEST_PORT });
    const getServer = () =>
      new McpServer({ name: "test", version: "1.0.0" });

    httpServer = await createAndStartHttpServer(getServer, { config, logger });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
      method: "GET"
    });

    expect(res.status).toBe(405);
  });

  it("enforces rate limiting when exceeded", async () => {
    const config = createTestConfig({ port: TEST_PORT + 1 });
    const getServer = () =>
      new McpServer({ name: "test", version: "1.0.0" });

    httpServer = await createAndStartHttpServer(getServer, {
      config,
      logger,
      rateLimitMax: 2,
      rateLimitWindowMs: 5000
    });

    const baseUrl = `http://127.0.0.1:${config.port}/mcp`;
    const initBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" }
      }
    });

    const req = () =>
      fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream"
        },
        body: initBody
      });

    await req();
    await req();
    const third = await req();

    expect(third.status).toBe(429);
    const body = await third.json();
    expect(body.error?.message).toMatch(/rate limit/i);
  });
});
