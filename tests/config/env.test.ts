import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/config/env.js";

describe("loadConfig", () => {
  it("parses a valid environment and applies defaults", () => {
    const config = loadConfig({
      MCP_TRANSPORT: "http",
      PORT: "4000",
      LOG_LEVEL: "debug",
      ALLOWED_DIRS: "/data,/more-data",
      MAX_FILE_BYTES: "2048",
      SQLITE_MAX_ROWS: "10",
      QUERY_TIMEOUT_MS: "2000"
    } as NodeJS.ProcessEnv);

    expect(config.transport).toBe("http");
    expect(config.port).toBe(4000);
    expect(config.logLevel).toBe("debug");
    expect(config.allowedDirs).toEqual(["/data", "/more-data"]);
    expect(config.maxFileBytes).toBe(2048);
    expect(config.sqliteMaxRows).toBe(10);
    expect(config.queryTimeoutMs).toBe(2000);
  });

  it("uses defaults for optional values and parses ALLOWED_DIRS", () => {
    const config = loadConfig({
      ALLOWED_DIRS: "/only-one"
    } as NodeJS.ProcessEnv);

    expect(config.transport).toBe("stdio");
    expect(config.port).toBe(3000);
    expect(config.logLevel).toBe("info");
    expect(config.allowedDirs).toEqual(["/only-one"]);
  });

  it("throws when ALLOWED_DIRS is missing or empty", () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(
      /ALLOWED_DIRS/i
    );

    expect(
      () =>
        loadConfig({
          ALLOWED_DIRS: " , "
        } as NodeJS.ProcessEnv)
    ).toThrow(/ALLOWED_DIRS/i);
  });

  it("throws on invalid MCP_TRANSPORT", () => {
    expect(() =>
      loadConfig({
        MCP_TRANSPORT: "invalid",
        ALLOWED_DIRS: "/data"
      } as unknown as NodeJS.ProcessEnv)
    ).toThrow(/Invalid environment configuration/i);
  });
});

