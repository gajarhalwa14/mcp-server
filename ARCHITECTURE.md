# MCP Server — Project Architecture

## Overview

This document describes the recommended directory structure and architectural layout for a production-ready Model Context Protocol (MCP) server project. The structure separates concerns cleanly: transport layer, tool definitions, resources, configuration, and tests all have dedicated homes, making the project easy to navigate, extend, and deploy.

---

## Directory Structure

```
mcp-server/
├── src/
│   ├── server.ts               # Entry point: instantiates and runs the MCP server
│   ├── tools/
│   │   ├── index.ts            # Barrel export — registers all tools with the server
│   │   ├── read-file.ts        # Tool: read a local file and return its contents
│   │   └── query-sqlite.ts     # Tool: run a read-only SQL query against a local SQLite DB
│   ├── resources/
│   │   ├── index.ts                  # Barrel export — registers all resources with the server
│   │   ├── server-config.ts          # Resource: config://server — exposes non-sensitive server config
│   │   └── sqlite-schema.ts          # Resource: schema://sqlite/{db_path} — exposes DB table/column schema
│   ├── prompts/
│   │   ├── index.ts            # Barrel export — registers all prompt templates
│   │   ├── analyse-file.ts     # Prompt: instructs the model to read + analyse a file
│   │   └── query-and-explain.ts # Prompt: instructs the model to run a query and explain results
│   ├── transport/
│   │   ├── stdio.ts            # STDIO transport configuration (for local / Claude Desktop)
│   │   └── http.ts             # Streamable HTTP transport configuration (for remote/cloud)
│   ├── config/
│   │   ├── env.ts              # Reads and validates environment variables (via dotenv/zod)
│   │   └── constants.ts        # Static constants shared across the codebase
│   └── utils/
│       ├── logger.ts           # Logging utility (writes to stderr, never stdout)
│       ├── errors.ts           # Shared error types and handlers
│       ├── path-guard.ts       # Resolves & validates file paths against ALLOWED_DIRS allowlist
│       └── sqlite-client.ts    # Thin wrapper around better-sqlite3: opens DB, enforces SELECT-only
│
├── tests/
│   ├── tools/
│   │   ├── read-file.test.ts         # Unit tests: path guard, size limit, mime detection, errors
│   │   └── query-sqlite.test.ts      # Unit tests: SELECT-only enforcement, params, row limit, timeout
│   ├── resources/
│   │   ├── server-config.test.ts
│   │   └── sqlite-schema.test.ts
│   └── integration/
│       └── server.test.ts            # End-to-end: spins up server, sends JSON-RPC, asserts responses
│
├── scripts/
│   └── inspect.sh              # Helper script to launch MCP Inspector for local debugging
│
├── .env.example                # Template for required environment variables
├── .env                        # Local secrets (gitignored)
├── .gitignore
├── package.json                # Dependencies and build/start scripts
├── tsconfig.json               # TypeScript configuration
├── ARCHITECTURE.md             # This file
├── SPEC.md                     # Feature and tech stack specification
└── README.md                   # Setup guide, usage, deployment instructions
```

---

## Layer Descriptions

### `src/server.ts` — Entry Point
Creates the `McpServer` instance, imports all tool/resource/prompt registrations from their barrel exports, selects the transport based on the runtime environment (STDIO vs. HTTP), and calls `server.connect(transport)` to begin listening.

### `src/tools/` — Tool Definitions
Each file exports a single tool: a name, a description, a Zod input schema, and an async handler function. The `index.ts` file imports them all and registers them on the server instance.

- **`read-file.ts`**: Validates the incoming path with `path-guard.ts`, checks file size, detects MIME type, reads the file as UTF-8, and returns the content. Never touches a path outside `ALLOWED_DIRS`.
- **`query-sqlite.ts`**: Validates the SQL statement is `SELECT`-only, validates the `db_path` with `path-guard.ts`, opens the database via `sqlite-client.ts`, runs the parameterised query with a timeout, and returns rows as a JSON array.

### `src/resources/` — Resources
Resources are file-like data that clients can read for context, identified by a URI.

- **`server-config.ts`**: Serves `config://server` — the active non-sensitive configuration (allowed dirs, transport mode, row/size limits). Lets the AI understand server constraints before calling tools.
- **`sqlite-schema.ts`**: Serves `schema://sqlite/{db_path}` — introspects a registered SQLite file and returns its table names, column names, and column types. Enables the AI to write correct `query_sqlite` calls without guessing schema.

### `src/prompts/` — Prompt Templates
Pre-written prompt templates that help users accomplish specific recurring tasks. Registered in the same pattern as tools and resources.

### `src/transport/` — Transport Layer
Isolates transport concerns from business logic. The STDIO transport is used for local development and integration with Claude Desktop. The HTTP transport is used for remote/cloud deployment and supports Server-Sent Events (SSE) for streaming.

### `src/config/` — Configuration
All environment variable reads are centralised here and validated with Zod at startup. This prevents silent misconfiguration and produces clear error messages when required variables are missing.

### `src/utils/` — Shared Utilities
Cross-cutting concerns shared by both tools:

- **`logger.ts`**: Writes structured logs to `stderr` only — never `stdout`, which would corrupt STDIO-mode JSON-RPC framing.
- **`errors.ts`**: Typed error classes (`PermissionError`, `FileTooLargeError`, `NonSelectQueryError`, `QueryTimeoutError`, etc.) that map cleanly to structured JSON-RPC error responses.
- **`path-guard.ts`**: The security centrepiece for both tools. Accepts a raw path, resolves it (following symlinks), and checks it falls within one of the directories listed in `ALLOWED_DIRS`. Throws a `PermissionError` immediately if not.
- **`sqlite-client.ts`**: Thin wrapper around `better-sqlite3`. Opens a database in read-only mode, enforces the `SELECT`-only rule by parsing the statement prefix, and applies the `QUERY_TIMEOUT_MS` limit.

### `tests/` — Test Suite
Unit tests per tool and resource. Integration tests spin up the full server, send raw JSON-RPC 2.0 messages, and assert on the structured responses — mirroring how a real MCP client would interact with the server.

---

## Data / Message Flow

```
MCP Client (e.g. Claude Desktop / custom agent)
        │
        │  JSON-RPC 2.0 over STDIO or HTTP
        ▼
┌───────────────────────┐
│   Transport Layer     │  (src/transport/stdio.ts or http.ts)
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│   MCP Server Core     │  (src/server.ts  —  @modelcontextprotocol/sdk)
│  - Tools registry     │
│  - Resources registry │
│  - Prompts registry   │
└──────────┬────────────┘
           │  dispatches to
  ┌────────┴──────────────┐
  ▼                       ▼
read_file              query_sqlite
(src/tools/            (src/tools/
 read-file.ts)          query-sqlite.ts)
  │                       │
  ▼                       ▼
path-guard.ts          sqlite-client.ts
  │                       │
  ▼                       ▼
Local filesystem       Local SQLite DB file
(within ALLOWED_DIRS)  (within ALLOWED_DIRS)
```

---

## Deployment Targets

| Mode | Transport | Use Case |
|---|---|---|
| Local | STDIO | Claude Desktop, MCP Inspector, development |
| Remote | Streamable HTTP | Production cloud, team-wide deployment |

The server selects its transport via the `MCP_TRANSPORT` environment variable (`stdio` or `http`). This ensures the same codebase can serve both contexts without branching logic in business code.
