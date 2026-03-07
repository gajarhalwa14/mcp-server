import { z } from "zod";
import { ensurePathAllowed } from "../utils/path-guard.js";
import {
  NonSelectQueryError,
  QueryTimeoutError,
  ToolExecutionError
} from "../utils/errors.js";
import { querySqlite } from "../utils/sqlite-client.js";
import type { Logger } from "../utils/logger.js";
import type { AppConfig } from "../config/env.js";

const QuerySqliteInputSchema = z.object({
  db_path: z.string().describe("Path to the SQLite database file"),
  sql: z.string().describe("SELECT statement to execute"),
  params: z
    .array(z.union([z.string(), z.number(), z.null()]))
    .optional()
    .default([])
});

export type QuerySqliteInput = z.infer<typeof QuerySqliteInputSchema>;

export interface QuerySqliteResult {
  rows: Record<string, unknown>[];
  row_count: number;
  columns: string[];
  truncated?: boolean;
}

export async function querySqliteHandler(
  input: unknown,
  config: AppConfig,
  logger: Logger
): Promise<QuerySqliteResult> {
  const start = Date.now();
  const parsed = QuerySqliteInputSchema.safeParse(input);

  if (!parsed.success) {
    const err = new Error(
      `Invalid input: ${JSON.stringify(parsed.error.format())}`
    );
    logger.toolInvocation(
      "query_sqlite",
      { db_path: "[invalid]" },
      Date.now() - start,
      "error"
    );
    throw err;
  }

  const { db_path, sql, params } = parsed.data;

  try {
    ensurePathAllowed(db_path, config.allowedDirs);
  } catch (e) {
    logger.toolInvocation(
      "query_sqlite",
      { db_path },
      Date.now() - start,
      "error"
    );
    throw e;
  }

  try {
    const result = querySqlite(db_path, sql, params, {
      maxRows: config.sqliteMaxRows,
      timeoutMs: config.queryTimeoutMs
    });

    logger.toolInvocation(
      "query_sqlite",
      { db_path },
      Date.now() - start,
      "success"
    );

    return {
      rows: result.rows,
      row_count: result.rowCount,
      columns: result.columns,
      ...(result.truncated && { truncated: true })
    };
  } catch (e) {
    logger.toolInvocation(
      "query_sqlite",
      { db_path },
      Date.now() - start,
      "error"
    );

    if (
      e instanceof NonSelectQueryError ||
      e instanceof QueryTimeoutError
    ) {
      throw e;
    }

    throw new ToolExecutionError(
      e instanceof Error ? e.message : "Failed to execute query"
    );
  }
}
