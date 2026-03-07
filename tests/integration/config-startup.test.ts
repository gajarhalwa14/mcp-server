import { describe, it, expect, vi } from "vitest";
import { start } from "../../src/server.js";

describe("server startup configuration", () => {
  it("logs and rejects when configuration is invalid", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      start({} as NodeJS.ProcessEnv)
    ).rejects.toThrow(/ALLOWED_DIRS/i);

    expect(errorSpy).toHaveBeenCalled();
    const logged = (errorSpy.mock.calls[0]?.[0] ?? "") as string;
    expect(logged).toMatch(/Failed to start MCP server due to invalid configuration/i);

    errorSpy.mockRestore();
  });
});

