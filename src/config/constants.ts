export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const MCP_TRANSPORTS = ["stdio", "http"] as const;
export type McpTransport = (typeof MCP_TRANSPORTS)[number];

export const DEFAULT_MCP_TRANSPORT: McpTransport = "stdio";
export const DEFAULT_PORT = 3000;

export const DEFAULT_MAX_FILE_BYTES = 1_048_576; // 1 MB
export const DEFAULT_SQLITE_MAX_ROWS = 500;
export const DEFAULT_QUERY_TIMEOUT_MS = 10_000;

export const CONFIG_RESOURCE_URI = "config://server" as const;
export const SQLITE_SCHEMA_RESOURCE_PREFIX = "schema://sqlite" as const;

