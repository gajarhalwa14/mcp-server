# MCP Server — Feature Specification

## Purpose

This document specifies the features, capabilities, and technology choices for a Model Context Protocol (MCP) server. The server acts as a standardised bridge between AI clients (such as Claude Desktop or a custom LLM agent) and external data sources or services, following the open MCP standard introduced by Anthropic in November 2024.

---

## Background

MCP is an open protocol built on JSON-RPC 2.0. It defines a client-server architecture where:

- **MCP Hosts** are AI-powered applications (e.g. Claude Desktop, an IDE plugin, a custom agent).
- **MCP Clients** are components embedded in the host that speak the protocol.
- **MCP Servers** expose capabilities — tools, resources, and prompts — that the AI can call.

The goal of this server is to expose a meaningful set of capabilities to AI clients without requiring any custom integration code on the client side, following MCP's plug-and-play philosophy.

---

## Core Capabilities

MCP defines three primitive capability types. This server implements all three.

### 1. Tools
Functions that the LLM can invoke (with user approval). Each tool has:
- A unique `name`
- A human-readable `description` (used by the model to decide when to call it)
- A typed input schema (validated at runtime)
- An async handler that performs the actual work and returns a structured result

**Implemented tools:**

#### `read_file`
Reads a file from the local filesystem and returns its contents as a UTF-8 string.

| Attribute | Detail |
|---|---|
| **Purpose** | Give the AI grounded access to real files on disk — configs, CSVs, logs, markdown docs, etc. |
| **Input schema** | `{ path: string }` — absolute or relative path to the target file |
| **Output** | `{ content: string, size_bytes: number, mime_type: string }` |
| **Security constraint** | The handler checks the resolved path against an `ALLOWED_DIRS` allowlist (from env config). Any path that resolves outside the allowlist is rejected with a permission error before the filesystem is touched. Symlinks are resolved before the check. |
| **Error cases** | File not found → structured 404-style error; path outside allowlist → structured permission error; file too large (> `MAX_FILE_BYTES`, default 1 MB) → structured size error |
| **Why this tool** | Files are the most universal data format. This one tool unlocks CSV analysis, log inspection, config review, and document Q&A without requiring any external service. |

#### `query_sqlite`
Executes a read-only SQL query against a local SQLite database file and returns the result rows as a JSON array.

| Attribute | Detail |
|---|---|
| **Purpose** | Give the AI structured, queryable access to local data without standing up a full database server. SQLite is zero-config and self-contained. |
| **Input schema** | `{ db_path: string, sql: string, params?: (string \| number \| null)[] }` |
| **Output** | `{ rows: Record<string, unknown>[], row_count: number, columns: string[] }` |
| **Security constraint** | Only `SELECT` statements are permitted. The handler parses the SQL and rejects any statement that is not a `SELECT` (no `INSERT`, `UPDATE`, `DELETE`, `DROP`, `PRAGMA`, etc.). The `db_path` is also checked against `ALLOWED_DIRS`. Queries are executed via parameterised statements to prevent SQL injection from the `params` array. |
| **Error cases** | Non-SELECT statement → structured rejection; db file not found → structured error; query timeout (> 10 s) → structured timeout error; result set too large (> 500 rows) → structured truncation warning with partial results |
| **Why this tool** | Pairs directly with `read_file`: flat files for unstructured data, SQLite for structured/relational data. Together they cover the majority of local data access patterns a developer or analyst would need. |

### 2. Resources
File-like data that clients can read for context. Resources are identified by a URI and can be static or dynamically generated.

**Implemented resources:**

- `config://server` — exposes the server's current non-sensitive configuration (allowed dirs, transport mode, limits) as context the AI can read before deciding how to call the tools
- `schema://sqlite/{db_path}` — exposes the table and column schema of a registered SQLite database, so the AI can introspect available tables before writing a `query_sqlite` call

### 3. Prompts
Pre-written, parameterised prompt templates for recurring tasks. These help users invoke common workflows without writing prompts from scratch.

**Implemented prompts:**

- `analyse-file` — template that instructs the model to read a specified file via `read_file` and produce a structured analysis (useful for CSV summaries, log triage, config review)
- `query-and-explain` — template that instructs the model to run a `query_sqlite` call and then explain the result in plain language, optionally comparing multiple queries

---

## Transport Support

The server must support both standard transports:

| Transport | Protocol | Use Case |
|---|---|---|
| STDIO | JSON-RPC over stdin/stdout | Local use, Claude Desktop, MCP Inspector |
| Streamable HTTP | JSON-RPC over HTTP + SSE | Remote/cloud deployment, multi-user |

The active transport is selected via the `MCP_TRANSPORT` environment variable. This allows a single deployment artefact to cover both local development and production scenarios.

---

## Non-Functional Requirements

### Security
- No secrets are ever logged or exposed via resources
- All tool inputs are validated with strict schemas before execution
- HTTP transport enforces CORS and rate limiting
- Environment variables are validated at startup; the server refuses to start on misconfiguration

### Observability
- Structured logging to `stderr` (never `stdout` in STDIO mode, which would corrupt JSON-RPC framing)
- Log levels: `debug`, `info`, `warn`, `error`
- Each tool invocation is logged with: tool name, input summary, duration, and outcome

### Error Handling
- All tool handlers wrap external calls in try/catch and return typed error responses
- Network timeouts are enforced on all outbound HTTP calls (default: 30 s)
- Unexpected errors are caught at the server level and returned as structured JSON-RPC error objects, never crashing the process

### Testability
- Each tool handler is a pure async function importable independently of the MCP server
- Integration tests send raw JSON-RPC messages and assert on structured responses
- A helper script (`scripts/inspect.sh`) launches the MCP Inspector for interactive debugging

---

## Tech Stack

### Language & Runtime
| Choice | Rationale |
|---|---|
| **TypeScript** | First-class support in the official MCP SDK; strong typing catches schema mismatches at compile time |
| **Node.js ≥ 18** | LTS, native `fetch`, ESM support, broad deployment target support |

### Core Dependencies
| Package | Purpose |
|---|---|
| `@modelcontextprotocol/sdk` | Official MCP server/client SDK from Anthropic; provides `McpServer`, `StdioServerTransport`, `StreamableHTTPServerTransport` |
| `zod` | Runtime schema validation for all tool inputs and environment configuration |
| `better-sqlite3` | Synchronous SQLite driver for Node.js — zero-config, no server required, powers `query_sqlite` |
| `dotenv` | Loads environment variables from `.env` in development |

### Development Dependencies
| Package | Purpose |
|---|---|
| `typescript` | Type checking and transpilation |
| `tsx` or `ts-node` | Run TypeScript directly in development without a build step |
| `vitest` or `jest` | Unit and integration testing |
| `@types/node` | Node.js type definitions |
| `eslint` + `prettier` | Linting and formatting |

### Build & Run
| Script | Command | Description |
|---|---|---|
| `build` | `tsc` | Compiles TypeScript to `./build` |
| `start` | `node build/server.js` | Runs the compiled server |
| `dev` | `tsx src/server.ts` | Runs directly with hot reload in development |
| `test` | `vitest run` | Runs the full test suite |
| `inspect` | `bash scripts/inspect.sh` | Launches MCP Inspector against the local server |

---

## Configuration

All runtime configuration is provided via environment variables. Required variables must be present or the server will exit with a descriptive error.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `PORT` | No | `3000` | HTTP port (only used when `MCP_TRANSPORT=http`) |
| `LOG_LEVEL` | No | `info` | Logging verbosity |
| `ALLOWED_DIRS` | Yes | — | Comma-separated list of absolute directory paths the server may read from (used by both `read_file` and `query_sqlite`) |
| `MAX_FILE_BYTES` | No | `1048576` | Maximum file size in bytes that `read_file` will return (default: 1 MB) |
| `SQLITE_MAX_ROWS` | No | `500` | Maximum number of rows `query_sqlite` will return per query |
| `QUERY_TIMEOUT_MS` | No | `10000` | Maximum execution time in ms for a `query_sqlite` call |

---

## Claude Desktop Integration

When running in STDIO mode, the server is registered in Claude Desktop's configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`) as follows:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/server.js"]
    }
  }
}
```

After restarting Claude Desktop, the registered tools, resources, and prompts become available in the conversation interface.

---

## Future Extensions

The following capabilities are out of scope for the initial implementation but are straightforward to add given the architecture:

- **Authentication on HTTP transport** — OAuth 2.0 support (now part of the MCP spec as of early 2025)
- **Persistent resource caching** — replace in-memory cache with Redis or SQLite
- **Tool versioning** — expose multiple versions of a tool under distinct names
- **Dynamic tool registration** — allow tools to be registered/deregistered at runtime via an admin endpoint
- **Remote deployment** — containerise with Docker and deploy to a cloud platform (e.g. Fly.io, Railway, Cloudflare Workers)
