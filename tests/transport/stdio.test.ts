import { describe, it, expect } from "vitest";
import { createStdioTransport } from "../../src/transport/stdio.js";

describe("createStdioTransport", () => {
  it("returns a StdioServerTransport instance", () => {
    const transport = createStdioTransport();
    expect(transport).toBeDefined();
    expect(typeof transport.start).toBe("function");
    expect(typeof transport.close).toBe("function");
    expect(typeof transport.send).toBe("function");
  });

  it("transport can be started and closed", async () => {
    const transport = createStdioTransport();
    await transport.start();
    await transport.close();
  });
});
