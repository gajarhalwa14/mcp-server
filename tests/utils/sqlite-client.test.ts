import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3";
import {
  querySqlite,
  assertSelectOnly
} from "../../src/utils/sqlite-client.js";
import { NonSelectQueryError } from "../../src/utils/errors.js";

describe("sqlite-client", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `sqlite-test-${Date.now()}.sqlite`);
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

  it("runs SELECT and returns rows with metadata", () => {
    const result = querySqlite(
      dbPath,
      "SELECT id, name FROM users ORDER BY id",
      [],
      { maxRows: 10, timeoutMs: 5000 }
    );

    expect(result.columns).toEqual(["id", "name"]);
    expect(result.rowCount).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual({ id: 1, name: "alice" });
    expect(result.truncated).toBe(false);
  });

  it("enforces row limit and sets truncated", () => {
    const result = querySqlite(
      dbPath,
      "SELECT id, name FROM users ORDER BY id",
      [],
      { maxRows: 2, timeoutMs: 5000 }
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rowCount).toBe(3);
    expect(result.truncated).toBe(true);
  });

  it("binds parameters correctly", () => {
    const result = querySqlite(
      dbPath,
      "SELECT name FROM users WHERE id = ?",
      [2],
      { maxRows: 10, timeoutMs: 5000 }
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ name: "bob" });
  });

  it("assertSelectOnly rejects non-SELECT statements", () => {
    expect(() => assertSelectOnly("INSERT INTO users VALUES (1, 'x')")).toThrow(
      NonSelectQueryError
    );
    expect(() => assertSelectOnly("DELETE FROM users")).toThrow(NonSelectQueryError);
    expect(() => assertSelectOnly("UPDATE users SET name = 'x'")).toThrow(
      NonSelectQueryError
    );
    expect(() => assertSelectOnly("PRAGMA table_info(users)")).toThrow(
      NonSelectQueryError
    );
  });

  it("allows SELECT with leading whitespace", () => {
    const result = querySqlite(
      dbPath,
      "  SELECT id FROM users LIMIT 1",
      [],
      { maxRows: 10, timeoutMs: 5000 }
    );
    expect(result.rows).toHaveLength(1);
  });
});
