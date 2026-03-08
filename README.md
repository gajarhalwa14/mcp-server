# MCP Server

A Model Context Protocol (MCP) server that exposes local file and SQLite access to AI clients such as Claude Desktop. Built with TypeScript and the official MCP SDK.

## Features

### Tools

| Tool | Description |
|------|-------------|
| `read_file` | Reads files from the local filesystem. Paths must be within `ALLOWED_DIRS`. Returns content, size, and MIME type. |
| `query_sqlite` | Runs read-only `SELECT` queries against local SQLite databases. Supports parameter binding, row limits, and timeouts. |

### Resources

| URI | Description |
|-----|-------------|
| `config://server` | Non-sensitive server configuration (transport, limits, allowed dirs). |
| `schema://sqlite/{db_path}` | Table and column schema for a SQLite database. |

### Prompts

| Prompt | Description |
|--------|-------------|
| `analyse-file` | Guides the model to read a file via `read_file` and produce a structured analysis. |
| `query-and-explain` | Guides the model to run `query_sqlite` and explain results in plain language. |

## Transport Modes

| Mode | Use case | How to enable |
|------|----------|---------------|
| **STDIO** | Claude Desktop, MCP Inspector, local dev | `MCP_TRANSPORT=stdio` (default) |
| **HTTP** | Remote deployment, multi-user | `MCP_TRANSPORT=http` |

HTTP mode includes CORS, rate limiting (100 req/15 min per IP), and DNS rebinding protection.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and set required variables:

```bash
cp .env.example .env
```

Edit `.env` and set `ALLOWED_DIRS` to comma-separated absolute paths the server may read from:

```
ALLOWED_DIRS=/path/to/your/data,/path/to/another/dir
```

### 3. Build and run

```bash
npm run build
npm run dev      # Development (tsx, hot reload)
# or
npm run start    # Production (node build/server.js)
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALLOWED_DIRS` | Yes | — | Comma-separated absolute paths for file and DB access |
| `MCP_TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `PORT` | No | `3000` | HTTP port (when `MCP_TRANSPORT=http`) |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `MAX_FILE_BYTES` | No | `1048576` | Max file size for `read_file` (1 MB) |
| `SQLITE_MAX_ROWS` | No | `500` | Max rows per `query_sqlite` result |
| `QUERY_TIMEOUT_MS` | No | `10000` | Query timeout in milliseconds |

## Claude Desktop Integration

Add the server to Claude Desktop's config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/server.js"],
      "env": {
        "ALLOWED_DIRS": "/path/to/your/data"
      }
    }
  }
}
```

Restart Claude Desktop to load the server.

## HTTP Mode

For remote deployment, set `MCP_TRANSPORT=http` and optionally `PORT`:

```bash
MCP_TRANSPORT=http PORT=3000 ALLOWED_DIRS=/data npm run start
```

The server listens on the given port. MCP clients connect to `http://host:port/mcp` for JSON-RPC over Streamable HTTP.

## Testing

```bash
npm run test          # Run tests (watch mode)
npm run test:run      # Run once
npm run test:coverage # Run with coverage report
```

## MCP Inspector

To debug the server with [MCP Inspector](https://github.com/modelcontextprotocol/inspector), run the server in STDIO mode and point the Inspector at it:

```bash
npm run dev
```

Then in MCP Inspector, add a server with command `node` and args `["build/server.js"]`, or use the `inspect` script when available.

## Documentation

- **Specification** — `SPEC.md` for features and tech stack
- **Architecture** — `ARCHITECTURE.md` for directory layout and design
- **Implementation** — `TODO.md` for the implementation checklist

## License

MIT
