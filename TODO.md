# TODO — MCP Server Implementation

## 1. Project scaffolding
- [ ] **Initial Node/TypeScript setup**
  - [ ] Initialise `package.json` with name, version, `type: module`, and `main` pointing at `build/server.js`.
  - [ ] Add `tsconfig.json` targeting Node ≥ 18 with ES module output and strict type-checking.
  - [ ] Add `.gitignore` (ignore `node_modules`, `build`, `.env`, SQLite files used only for tests/fixtures, etc.).
- [ ] **Install core runtime dependencies**
  - [ ] `@modelcontextprotocol/sdk`
  - [ ] `zod`
  - [ ] `better-sqlite3`
  - [ ] `dotenv`
- [ ] **Install development dependencies**
  - [ ] `typescript`
  - [ ] `tsx` (or `ts-node`, choose one and standardise)
  - [ ] Test runner: `vitest` (or `jest`, choose one and standardise)
  - [ ] `@types/node`
  - [ ] `eslint` + `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`
  - [ ] `prettier` (and optional eslint-prettier integration)
- [ ] **Top-level project files**
  - [ ] Create initial `README.md` with short description and basic usage.
  - [ ] Ensure `SPEC.md` and `ARCHITECTURE.md` are linked from `README.md` (for discoverability).

## 2. Configuration layer (`src/config`)
- [ ] **Create directory structure**
  - [ ] Create `src/` and subdirectories: `tools`, `resources`, `prompts`, `transport`, `config`, `utils`.
- [ ] **Environment configuration (`env.ts`)**
  - [ ] Implement `src/config/env.ts` that:
    - [ ] Loads `.env` via `dotenv` in development (but is safe/no-op in production if `.env` is absent).
    - [ ] Defines a Zod schema for all environment variables listed in `SPEC.md`:
      - [ ] `MCP_TRANSPORT` (`stdio` | `http`, default `stdio`)
      - [ ] `PORT` (number, default `3000`, only used when HTTP transport enabled)
      - [ ] `LOG_LEVEL` (`debug` | `info` | `warn` | `error`, default `info`)
      - [ ] `ALLOWED_DIRS` (required, comma-separated absolute paths)
      - [ ] `MAX_FILE_BYTES` (default `1048576`)
      - [ ] `SQLITE_MAX_ROWS` (default `500`)
      - [ ] `QUERY_TIMEOUT_MS` (default `10000`)
    - [ ] Validates env at startup; if invalid/missing required values, throws a descriptive error and prevents server from starting.
    - [ ] Exports a strongly typed `config` object used elsewhere.
- [ ] **Static constants (`constants.ts`)**
  - [ ] Implement `src/config/constants.ts` for shared constants:
    - [ ] Default log level strings.
    - [ ] Default limits that may be re-used in tests and runtime.
    - [ ] Any shared identifiers for resources (e.g. `CONFIG_RESOURCE_URI = "config://server"`).
- [ ] **.env templates**
  - [ ] Create `.env.example` showcasing all relevant variables with safe example values.
  - [ ] Ensure `.env` is gitignored and used only locally.

## 3. Shared utilities (`src/utils`)
- [ ] **Logger (`logger.ts`)**
  - [ ] Implement a logger that:
    - [ ] Writes structured JSON or key-value logs to `stderr` only (never `stdout`).
    - [ ] Supports log levels `debug`, `info`, `warn`, `error` driven by `LOG_LEVEL`.
    - [ ] Provides helpers for logging tool invocations (name, input summary, duration, outcome).
- [ ] **Error types (`errors.ts`)**
  - [ ] Implement custom error classes matching the spec:
    - [ ] `PermissionError`
    - [ ] `FileTooLargeError`
    - [ ] `NonSelectQueryError`
    - [ ] `QueryTimeoutError`
    - [ ] Generic `ToolExecutionError` and other structured error types as needed.
  - [ ] Ensure each error type includes a stable error code and human-readable message suitable for JSON-RPC error objects.
- [ ] **Path guard (`path-guard.ts`)**
  - [ ] Implement helper that:
    - [ ] Takes a path (absolute or relative).
    - [ ] Resolves it (including symlinks) to an absolute path.
    - [ ] Checks that it is within at least one directory from `ALLOWED_DIRS`.
    - [ ] Throws `PermissionError` if outside the allowlist before any filesystem access.
  - [ ] Provide a small API, e.g. `ensurePathAllowed(rawPath: string): string` returning the resolved safe path.
- [ ] **SQLite client (`sqlite-client.ts`)**
  - [ ] Implement thin wrapper around `better-sqlite3` that:
    - [ ] Opens databases in read-only mode.
    - [ ] Enforces `SELECT`-only queries by examining/normalising the SQL string.
    - [ ] Applies a `QUERY_TIMEOUT_MS` timeout (cancel or abort long-running queries).
    - [ ] Enforces the `SQLITE_MAX_ROWS` limit, truncating results and signalling when truncation occurs.
  - [ ] Exposes a simple API for running parameterised SELECT queries and returning rows + metadata.

## 4. Tool implementations (`src/tools`)
- [ ] **Tools index (`index.ts`)**
  - [ ] Implement `src/tools/index.ts` to:
    - [ ] Export a function that takes an `McpServer` instance and registers all tools.
    - [ ] Centralise the mapping from tool name to handler.
- [ ] **`read-file.ts` tool**
  - [ ] Implement TypeScript definitions:
    - [ ] Name: `read_file`.
    - [ ] Description: per `SPEC.md` (file reading, grounded access).
    - [ ] Zod input schema: `{ path: string }`.
  - [ ] Handler behaviour:
    - [ ] Validate input against schema.
    - [ ] Use `path-guard` to ensure path is inside `ALLOWED_DIRS`.
    - [ ] Check file existence and size before reading; enforce `MAX_FILE_BYTES`.
    - [ ] Detect MIME type (simple extension-based mapping is sufficient initially).
    - [ ] Read file as UTF-8, returning:
      - [ ] `content: string`
      - [ ] `size_bytes: number`
      - [ ] `mime_type: string`
    - [ ] Map failure conditions to structured errors:
      - [ ] File not found → 404-style error object.
      - [ ] Path outside allowlist → `PermissionError`.
      - [ ] File too large → `FileTooLargeError`.
    - [ ] Log each invocation (tool name, path summary, duration, outcome).
- [ ] **`query-sqlite.ts` tool**
  - [ ] Implement TypeScript definitions:
    - [ ] Name: `query_sqlite`.
    - [ ] Description: per `SPEC.md` (read-only SQL access).
    - [ ] Zod input schema: `{ db_path: string, sql: string, params?: (string | number | null)[] }`.
  - [ ] Handler behaviour:
    - [ ] Validate input with schema.
    - [ ] Validate `db_path` using `path-guard`.
    - [ ] Enforce SQL is `SELECT`-only (no mutating statements, no PRAGMAs).
    - [ ] Use `sqlite-client` to run the query with parameter binding and timeout.
    - [ ] Enforce row count limit (`SQLITE_MAX_ROWS`), returning:
      - [ ] `rows: Record<string, unknown>[]`
      - [ ] `row_count: number`
      - [ ] `columns: string[]`
      - [ ] Optional truncation indicator if applicable.
    - [ ] Map all failure cases to structured errors:
      - [ ] Non-SELECT statement → `NonSelectQueryError`.
      - [ ] DB file not found / cannot open → dedicated error.
      - [ ] Query timeout → `QueryTimeoutError` with partial/no results according to design.
    - [ ] Log each invocation with an input summary (no sensitive data), duration, and outcome.

## 5. Resources (`src/resources`)
- [ ] **Resources index (`index.ts`)**
  - [ ] Implement a registration function that attaches all resources to the `McpServer` instance.
- [ ] **`server-config.ts` resource**
  - [ ] Implement `config://server` resource that:
    - [ ] Exposes non-sensitive configuration (transport choice, limits, allowed dirs, versions).
    - [ ] Never exposes secrets (e.g. actual API keys or sensitive paths).
    - [ ] Uses the validated `config` object from `src/config/env.ts`.
- [ ] **`sqlite-schema.ts` resource**
  - [ ] Implement `schema://sqlite/{db_path}` resource that:
    - [ ] Parses and validates the `{db_path}` segment.
    - [ ] Validates path with `path-guard`.
    - [ ] Introspects the SQLite schema (table names, column names, column types).
    - [ ] Returns a structured description consumable by the AI to build `query_sqlite` calls.

## 6. Prompts (`src/prompts`)
- [ ] **Prompts index (`index.ts`)**
  - [ ] Implement a registration function that attaches all prompts to the `McpServer` instance.
- [ ] **`analyse-file.ts` prompt**
  - [ ] Implement the `analyse-file` prompt template that:
    - [ ] Guides the model to call `read_file` appropriately.
    - [ ] Encourages structured analysis output (summary, anomalies, recommendations, etc.).
- [ ] **`query-and-explain.ts` prompt**
  - [ ] Implement the `query-and-explain` prompt template that:
    - [ ] Guides the model to call `query_sqlite`, optionally multiple times.
    - [ ] Instructs the model to explain results in plain language and highlight insights or comparisons.

## 7. Transport layer (`src/transport`)
- [ ] **STDIO transport (`stdio.ts`)**
  - [ ] Implement helper that:
    - [ ] Configures `StdioServerTransport` from `@modelcontextprotocol/sdk`.
    - [ ] Ensures all logs go to `stderr` only.
    - [ ] Is suitable for local development, Claude Desktop, and MCP Inspector.
- [ ] **HTTP transport (`http.ts`)**
  - [ ] Implement helper that:
    - [ ] Configures `StreamableHTTPServerTransport` from the MCP SDK.
    - [ ] Uses `PORT` and `LOG_LEVEL` from config.
    - [ ] Enforces CORS rules (configurable allowlist or sane defaults).
    - [ ] Implements basic rate limiting (IP or token bucket, as appropriate).
    - [ ] Supports streaming responses via SSE per MCP spec.

## 8. Server entry point (`src/server.ts`)
- [ ] **Server creation and wiring**
  - [ ] Instantiate `McpServer` from `@modelcontextprotocol/sdk`.
  - [ ] Import and register all tools, resources, and prompts via their index modules.
  - [ ] Select transport based on validated env (`MCP_TRANSPORT`).
  - [ ] Connect server to chosen transport (`server.connect(transport)`).
- [ ] **Global error handling**
  - [ ] Ensure unexpected exceptions are caught at the top level and translated into JSON-RPC error responses.
  - [ ] Prevent the process from crashing on a single bad request.
  - [ ] Ensure server exits early with clear logs on configuration errors.

## 9. Testing (`tests/`)
- [ ] **Test infrastructure**
  - [ ] Choose and configure test runner (Vitest or Jest) and add `test` script to `package.json`.
  - [ ] Set up TypeScript-aware test config, including path aliases if used.
- [ ] **Unit tests for tools (`tests/tools/`)**
  - [ ] `read-file.test.ts`:
    - [ ] Test allowed vs disallowed paths (`path-guard` integration).
    - [ ] Test max size enforcement and MIME detection.
    - [ ] Test file-not-found and permission errors.
  - [ ] `query-sqlite.test.ts`:
    - [ ] Test `SELECT`-only enforcement.
    - [ ] Test parameter binding and row limits.
    - [ ] Test query timeout behaviour.
    - [ ] Test DB-not-found and permission errors.
- [ ] **Unit tests for resources (`tests/resources/`)**
  - [ ] `server-config.test.ts`:
    - [ ] Assert only non-sensitive config fields are exposed.
  - [ ] `sqlite-schema.test.ts`:
    - [ ] Assert schema output for a sample SQLite file matches expectations.
- [ ] **Integration tests (`tests/integration/server.test.ts`)**
  - [ ] Spin up the full server in a test harness.
  - [ ] Send raw JSON-RPC 2.0 requests for:
    - [ ] `read_file`
    - [ ] `query_sqlite`
    - [ ] Resource reads (`config://server`, `schema://sqlite/...`)
  - [ ] Assert on structured responses, including error cases.

## 10. Scripts and developer experience
- [ ] **Inspector script**
  - [ ] Implement `scripts/inspect.sh` to launch MCP Inspector pointed at the local server (STDIO mode).
  - [ ] Add an `inspect` script to `package.json` that calls this helper.
- [ ] **NPM/Yarn/PNPM scripts**
  - [ ] `build` → `tsc` output to `./build`.
  - [ ] `start` → `node build/server.js`.
  - [ ] `dev` → `tsx src/server.ts` (or equivalent for chosen runner).
  - [ ] `test` → execute the test runner.
  - [ ] `lint` / `format` → run ESLint and Prettier.

## 11. Documentation and examples
- [ ] **README updates**
  - [ ] Document setup steps (install dependencies, configure `.env`, run `dev` / `start`).
  - [ ] Describe tools, resources, and prompts exposed by the MCP server.
  - [ ] Document how to run tests and use MCP Inspector.
- [ ] **Claude Desktop integration example**
  - [ ] Add a snippet showing how to register this server in Claude Desktop config (based on `SPEC.md`).
- [ ] **HTTP deployment notes**
  - [ ] Add brief guidance for running in HTTP mode (e.g. behind a reverse proxy or PaaS).

## 12. Optional future extensions (from SPEC)
- [ ] **Authentication for HTTP transport**
  - [ ] Design how OAuth 2.0 or other auth will be integrated in front of or within the HTTP transport.
- [ ] **Persistent caching for resources**
  - [ ] Replace/augment in-memory caching (if added) with Redis or SQLite-based caches.
- [ ] **Tool versioning and dynamic registration**
  - [ ] Add a mechanism for registering multiple versions of a tool and/or dynamically adding/removing tools at runtime.
- [ ] **Containerisation and cloud deployment**
  - [ ] Add Dockerfile and deployment docs (e.g. Fly.io, Railway, etc.) once core server is stable.

