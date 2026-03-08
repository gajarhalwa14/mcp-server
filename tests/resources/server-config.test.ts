import { describe, it, expect } from "vitest";
import { getServerConfigContent } from "../../src/resources/server-config.js";
import type { AppConfig } from "../../src/config/env.js";

describe("server-config resource", () => {
  const config: AppConfig = {
    transport: "stdio",
    port: 3000,
    logLevel: "info",
    allowedDirs: ["/data", "/tmp"],
    maxFileBytes: 1048576,
    sqliteMaxRows: 500,
    queryTimeoutMs: 10000,
    configResourceUri: "config://server"
  };

  it("returns non-sensitive config as JSON", () => {
    const content = getServerConfigContent(config);
    const parsed = JSON.parse(content);
    expect(parsed.transport).toBe("stdio");
    expect(parsed.port).toBe(3000);
    expect(parsed.allowedDirs).toEqual(["/data", "/tmp"]);
  });

  it("never exposes secrets or sensitive paths", () => {
    const content = getServerConfigContent(config);
    const keys = Object.keys(JSON.parse(content));
    expect(keys).not.toContain("apiKey");
    expect(keys).not.toContain("secret");
  });
});
