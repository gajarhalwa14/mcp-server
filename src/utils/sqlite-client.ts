import Database from "better-sqlite3";
import {
  NonSelectQueryError,
  QueryTimeoutError
} from "./errors.js";

export interface SqliteQueryOptions {
  maxRows: number;
  timeoutMs: number;
}

export interface SqliteQueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  truncated: boolean;
}

export function assertSelectOnly(sql: string): void {
  const trimmed = sql.trim().toLowerCase();

  if (!trimmed.startsWith("select")) {
    throw new NonSelectQueryError(
      "Only SELECT statements are permitted for query_sqlite"
    );
  }
}

export function querySqlite(
  dbPath: string,
  sql: string,
  params: (string | number | null)[] = [],
  options: SqliteQueryOptions
): SqliteQueryResult {
  assertSelectOnly(sql);

  const db = new Database(dbPath, {
    readonly: true,
    fileMustExist: true
  });

  const start = Date.now();

  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    const durationMs = Date.now() - start;

    if (durationMs > options.timeoutMs) {
      throw new QueryTimeoutError(
        `Query exceeded timeout of ${options.timeoutMs} ms`
      );
    }

    const columns = stmt.columns().map((c) => c.name);
    const rowCount = rows.length;

    let truncated = false;
    let limitedRows = rows;

    if (rowCount > options.maxRows) {
      truncated = true;
      limitedRows = rows.slice(0, options.maxRows);
    }

    return {
      rows: limitedRows as Record<string, unknown>[],
      columns,
      rowCount,
      truncated
    };
  } finally {
    db.close();
  }
}

