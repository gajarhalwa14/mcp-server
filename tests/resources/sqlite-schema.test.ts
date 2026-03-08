import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3";
import {
  introspectSqliteSchema,
  formatSchemaAsText
} from "../../src/resources/sqlite-schema.js";
import { PermissionError } from "../../src/utils/errors.js";
import type { AppConfig } from "../../src/config/env.js";

describe("sqlite-schema resource", () => {
  let dbPath: string;
  const tmpDir = os.tmpdir();
  const config: AppConfig = {
    transport: "stdio",
    port: 3000,
    logLevel: "info",
    allowedDirs: [tmpDir],
    maxFileBytes: 1048576,
    sqliteMaxRows: 500,
    queryTimeoutMs: 10000,
    configResourceUri: "config://server"
  };

  beforeEach(() => {
    dbPath = path.join(tmpDir, `schema-test-${Date.now()}.sqlite`);
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
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

  it("introspects tables and columns", () => {
    const schema = introspectSqliteSchema(dbPath, config);

    expect(schema).toHaveLength(2);
    const users = schema.find((t) => t.name === "users");
    expect(users).toBeDefined();
    expect(users?.columns).toContainEqual(
      expect.objectContaining({ name: "id", type: "INTEGER" })
    );
    expect(users?.columns).toContainEqual(
      expect.objectContaining({ name: "name", type: "TEXT" })
    );
  });

  it("formatSchemaAsText produces readable output", () => {
    const schema = introspectSqliteSchema(dbPath, config);
    const text = formatSchemaAsText(schema);

    expect(text).toContain("Table: users");
    expect(text).toContain("- id:");
    expect(text).toContain("- name:");
    expect(text).toContain("Table: posts");
  });

  it("throws PermissionError for path outside allowed dirs", () => {
    expect(() =>
      introspectSqliteSchema("/some/other/db.sqlite", config)
    ).toThrow(PermissionError);
  });
});
