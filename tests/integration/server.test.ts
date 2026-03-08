import { describe, it, expect, afterEach } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { start } from "../../src/server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const allowedDirs = join(projectRoot, "tests");

const TEST_PORT = 39490;

function mcpFetch(
  baseUrl: string,
  method: string,
  params: Record<string, unknown>
) {
  return fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1e6),
      method,
      params
    })
  });
}

describe("server entry point", () => {
  let serverHandle: Awaited<ReturnType<typeof start>>;

  afterEach(async () => {
    if (serverHandle) {
      await serverHandle.close();
      serverHandle = undefined;
    }
  });

  it("starts in HTTP mode and responds to initialize", async () => {
    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT),
      ALLOWED_DIRS: allowedDirs
    });

    expect(serverHandle).toBeDefined();

    const baseUrl = `http://127.0.0.1:${TEST_PORT}/mcp`;
    const res = await fetch(baseUrl, {
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
    expect(data.result?.serverInfo?.name).toBe("mcp-server");
  });

  it("starts in HTTP mode and lists tools", async () => {
    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT + 1),
      ALLOWED_DIRS: allowedDirs
    });

    expect(serverHandle).toBeDefined();

    const baseUrl = `http://127.0.0.1:${TEST_PORT + 1}/mcp`;
    const listRes = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
      })
    });

    expect(listRes.ok).toBe(true);
    const listData = await listRes.json();
    const toolNames =
      listData.result?.tools?.map((t: { name: string }) => t.name) ?? [];
    expect(toolNames).toContain("read_file");
    expect(toolNames).toContain("query_sqlite");
  });

  it("invokes read_file via tools/call", async () => {
    const fixturesDir = join(allowedDirs, "fixtures");
    mkdirSync(fixturesDir, { recursive: true });
    const testFile = join(fixturesDir, "integration-test-file.txt");
    const testContent = "Hello from integration test";
    writeFileSync(testFile, testContent);

    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT + 2),
      ALLOWED_DIRS: allowedDirs
    });

    try {
      const baseUrl = `http://127.0.0.1:${TEST_PORT + 2}/mcp`;
      const res = await mcpFetch(baseUrl, "tools/call", {
        name: "read_file",
        arguments: { path: testFile }
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.result).toBeDefined();
      const content = data.result?.content ?? [];
      expect(content.length).toBeGreaterThan(0);
      const structured = data.result?.structuredContent;
      expect(structured?.content).toBe(testContent);
      expect(structured?.mime_type).toBe("text/plain");
    } finally {
      if (existsSync(testFile)) unlinkSync(testFile);
    }
  });

  it("invokes query_sqlite via tools/call", async () => {
    const fixturesDir = join(allowedDirs, "fixtures");
    mkdirSync(fixturesDir, { recursive: true });
    const dbPath = join(fixturesDir, "integration-test.sqlite");
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE sample (id INTEGER, val TEXT);
      INSERT INTO sample VALUES (1, 'a'), (2, 'b');
    `);
    db.close();

    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT + 3),
      ALLOWED_DIRS: allowedDirs
    });

    try {
      const baseUrl = `http://127.0.0.1:${TEST_PORT + 3}/mcp`;
      const res = await mcpFetch(baseUrl, "tools/call", {
        name: "query_sqlite",
        arguments: {
          db_path: dbPath,
          sql: "SELECT id, val FROM sample ORDER BY id"
        }
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      const structured = data.result?.structuredContent;
      expect(structured?.rows).toHaveLength(2);
      expect(structured?.rows[0]).toEqual({ id: 1, val: "a" });
    } finally {
      if (existsSync(dbPath)) unlinkSync(dbPath);
    }
  });

  it("reads config://server resource via resources/read", async () => {
    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT + 4),
      ALLOWED_DIRS: allowedDirs
    });

    const baseUrl = `http://127.0.0.1:${TEST_PORT + 4}/mcp`;
    const res = await mcpFetch(baseUrl, "resources/read", {
      uri: "config://server"
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    const contents = data.result?.contents ?? [];
    expect(contents.length).toBeGreaterThan(0);
    const text = contents[0]?.text ?? "";
    const parsed = JSON.parse(text);
    expect(parsed.transport).toBe("http");
    expect(parsed.port).toBe(TEST_PORT + 4);
    expect(parsed.allowedDirs).toBeDefined();
  });

  it("reads schema://sqlite resource via resources/read", async () => {
    const fixturesDir = join(allowedDirs, "fixtures");
    mkdirSync(fixturesDir, { recursive: true });
    const dbPath = join(fixturesDir, "schema-test.sqlite");
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT);
    `);
    db.close();

    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT + 5),
      ALLOWED_DIRS: allowedDirs
    });

    try {
      const uri = `schema://sqlite/${encodeURIComponent(dbPath)}`;
      const baseUrl = `http://127.0.0.1:${TEST_PORT + 5}/mcp`;
      const res = await mcpFetch(baseUrl, "resources/read", { uri });

      expect(res.ok).toBe(true);
      const data = await res.json();
      const contents = data.result?.contents ?? [];
      expect(contents.length).toBeGreaterThan(0);
      const text = contents[0]?.text ?? "";
      expect(text).toContain("Table: items");
      expect(text).toContain("id");
      expect(text).toContain("name");
    } finally {
      if (existsSync(dbPath)) unlinkSync(dbPath);
    }
  });

  it("returns error for read_file with disallowed path", async () => {
    serverHandle = await start({
      ...process.env,
      MCP_TRANSPORT: "http",
      PORT: String(TEST_PORT + 6),
      ALLOWED_DIRS: allowedDirs
    });

    const baseUrl = `http://127.0.0.1:${TEST_PORT + 6}/mcp`;
    const res = await mcpFetch(baseUrl, "tools/call", {
      name: "read_file",
      arguments: { path: "/etc/passwd" }
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    const structured = data.result?.structuredContent;
    expect(structured?.error).toBe("PERMISSION_DENIED");
  });
});
