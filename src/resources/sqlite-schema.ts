import Database from "better-sqlite3";
import { ensurePathAllowed } from "../utils/path-guard.js";
import type { AppConfig } from "../config/env.js";

export interface TableSchema {
  name: string;
  columns: { name: string; type: string | null }[];
}

export function introspectSqliteSchema(
  dbPath: string,
  config: AppConfig
): TableSchema[] {
  ensurePathAllowed(dbPath, config.allowedDirs);

  const db = new Database(dbPath, {
    readonly: true,
    fileMustExist: true
  });

  try {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master 
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all() as { name: string }[];

    const result: TableSchema[] = [];

    for (const { name: tableName } of tables) {
      const columns = db
        .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
        .all() as { name: string; type: string | null }[];

      result.push({
        name: tableName,
        columns: columns.map((c) => ({ name: c.name, type: c.type }))
      });
    }

    return result;
  } finally {
    db.close();
  }
}

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function formatSchemaAsText(schema: TableSchema[]): string {
  const lines: string[] = [];

  for (const table of schema) {
    lines.push(`Table: ${table.name}`);
    for (const col of table.columns) {
      lines.push(`  - ${col.name}: ${col.type ?? "ANY"}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
