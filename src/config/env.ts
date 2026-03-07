import dotenv from "dotenv";
import { z } from "zod";
import {
  CONFIG_RESOURCE_URI,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MCP_TRANSPORT,
  DEFAULT_PORT,
  DEFAULT_QUERY_TIMEOUT_MS,
  DEFAULT_SQLITE_MAX_ROWS,
  LOG_LEVELS,
  MCP_TRANSPORTS,
  type LogLevel,
  type McpTransport
} from "./constants.js";

dotenv.config();

const EnvSchema = z.object({
  MCP_TRANSPORT: z
    .enum(MCP_TRANSPORTS)
    .default(DEFAULT_MCP_TRANSPORT),
  PORT: z
    .coerce.number()
    .int()
    .positive()
    .max(65535)
    .default(DEFAULT_PORT),
  LOG_LEVEL: z
    .enum(LOG_LEVELS)
    .default("info"),
  ALLOWED_DIRS: z
    .string()
    .min(1, "ALLOWED_DIRS must not be empty"),
  MAX_FILE_BYTES: z
    .coerce.number()
    .int()
    .positive()
    .default(DEFAULT_MAX_FILE_BYTES),
  SQLITE_MAX_ROWS: z
    .coerce.number()
    .int()
    .positive()
    .default(DEFAULT_SQLITE_MAX_ROWS),
  QUERY_TIMEOUT_MS: z
    .coerce.number()
    .int()
    .positive()
    .default(DEFAULT_QUERY_TIMEOUT_MS)
});

export type RawEnv = z.infer<typeof EnvSchema>;

export interface AppConfig {
  transport: McpTransport;
  port: number;
  logLevel: LogLevel;
  allowedDirs: string[];
  maxFileBytes: number;
  sqliteMaxRows: number;
  queryTimeoutMs: number;
  configResourceUri: string;
}

function parseAllowedDirs(raw: string): string[] {
  const dirs = raw
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (dirs.length === 0) {
    throw new Error(
      "ALLOWED_DIRS must contain at least one non-empty directory path"
    );
  }

  return dirs;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env
): AppConfig {
  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(
        result.error.format(),
        null,
        2
      )}`
    );
  }

  const data = result.data;
  const allowedDirs = parseAllowedDirs(data.ALLOWED_DIRS);

  return {
    transport: data.MCP_TRANSPORT,
    port: data.PORT,
    logLevel: data.LOG_LEVEL,
    allowedDirs,
    maxFileBytes: data.MAX_FILE_BYTES,
    sqliteMaxRows: data.SQLITE_MAX_ROWS,
    queryTimeoutMs: data.QUERY_TIMEOUT_MS,
    configResourceUri: CONFIG_RESOURCE_URI
  };
}

