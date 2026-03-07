import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3";
import { querySqliteHandler } from "../../src/tools/query-sqlite.js";
import { NonSelectQueryError, PermissionError } from "../../src/utils/errors.js";
import { createLogger } from "../../src/utils/logger.js";
import type { AppConfig } from "../../src/config/env.js";

describe("query_sqlite tool", () => {
  let dbPath: string;
  const tmpDir = os.tmpdir();
  const allowedDirs = [tmpDir];
  const config: AppConfig = {
    transport: "stdio",
    port: 3000,
    logLevel: "info",
    allowedDirs,
    maxFileBytes: 1048576,
    sqliteMaxRows: 5,
    queryTimeoutMs: 5000,
    configResourceUri: "config://server"
  };
  const logger = createLogger("info", () => {});

  beforeEach(() => {
    dbPath = path.join(tmpDir, `query-sqlite-test-${Date.now()}.sqlite`);
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO users (id, name) VALUES (1, 'alice'), (2, 'bob'), (3, 'carol');
    `);
    db.close();
  });

  afterEach(() => {
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it("runs SELECT and returns rows", async () => {
    const result = await querySqliteHandler(
      {
        db_path: dbPath,
        sql: "SELECT id, name FROM users ORDER BY id"
      },
      config,
      logger
    );

    expect(result.rows).toHaveLength(3);
    expect(result.row_count).toBe(3);
    expect(result.columns).toEqual(["id", "name"]);
    expect(result.rows[0]).toEqual({ id: 1, name: "alice" });
    expect(result.truncated).toBeUndefined();
  });

  it("enforces row limit and sets truncated", async () => {
    const result = await querySqliteHandler(
      {
        db_path: dbPath,
        sql: "SELECT id, name FROM users ORDER BY id"
      },
      { ...config, sqliteMaxRows: 2 },
      logger
    );

    expect(result.rows).toHaveLength(2);
    expect(result.row_count).toBe(3);
    expect(result.truncated).toBe(true);
  });

  it("binds parameters", async () => {
    const result = await querySqliteHandler(
      {
        db_path: dbPath,
        sql: "SELECT name FROM users WHERE id = ?",
        params: [2]
      },
      config,
      logger
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ name: "bob" });
  });

  it("throws NonSelectQueryError for INSERT", async () => {
    await expect(
      querySqliteHandler(
        {
          db_path: dbPath,
          sql: "INSERT INTO users (id, name) VALUES (4, 'dave')"
        },
        config,
        logger
      )
    ).rejects.toThrow(NonSelectQueryError);
  });

  it("throws PermissionError for db_path outside allowed dirs", async () => {
    await expect(
      querySqliteHandler(
        {
          db_path: "/some/other/db.sqlite",
          sql: "SELECT 1"
        },
        config,
        logger
      )
    ).rejects.toThrow(PermissionError);
  });
});
