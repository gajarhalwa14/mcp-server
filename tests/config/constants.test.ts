import { describe, it, expect } from "vitest";
import {
  CONFIG_RESOURCE_URI,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MCP_TRANSPORT,
  DEFAULT_PORT,
  DEFAULT_QUERY_TIMEOUT_MS,
  DEFAULT_SQLITE_MAX_ROWS,
  LOG_LEVELS,
  MCP_TRANSPORTS,
  SQLITE_SCHEMA_RESOURCE_PREFIX
} from "../../src/config/constants.js";

describe("config/constants", () => {
  it("exposes expected log levels and transports", () => {
    expect(LOG_LEVELS).toEqual(["debug", "info", "warn", "error"]);
    expect(MCP_TRANSPORTS).toEqual(["stdio", "http"]);
    expect(DEFAULT_MCP_TRANSPORT).toBe("stdio");
  });

  it("exposes default limits", () => {
    expect(DEFAULT_PORT).toBe(3000);
    expect(DEFAULT_MAX_FILE_BYTES).toBe(1_048_576);
    expect(DEFAULT_SQLITE_MAX_ROWS).toBe(500);
    expect(DEFAULT_QUERY_TIMEOUT_MS).toBe(10_000);
  });

  it("exposes resource identifiers", () => {
    expect(CONFIG_RESOURCE_URI).toBe("config://server");
    expect(SQLITE_SCHEMA_RESOURCE_PREFIX).toBe("schema://sqlite");
  });
});

