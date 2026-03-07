import { describe, it, expect, vi } from "vitest";
import { createLogger } from "../../src/utils/logger.js";

describe("logger", () => {
  it("logs only at or above configured level", () => {
    const lines: string[] = [];
    const sink = (line: string) => {
      lines.push(line);
    };

    const logger = createLogger("info", sink);

    logger.debug("should not appear");
    logger.info("info message", { foo: "bar" });
    logger.error("error message");

    expect(lines.length).toBe(2);
    const parsed = lines.map((l) => JSON.parse(l));

    expect(parsed[0].level).toBe("info");
    expect(parsed[0].message).toBe("info message");
    expect(parsed[0].foo).toBe("bar");

    expect(parsed[1].level).toBe("error");
    expect(parsed[1].message).toBe("error message");
  });

  it("writes to stderr by default", () => {
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const logger = createLogger("debug");
    logger.debug("test");

    expect(spy).toHaveBeenCalled();

    const logged = spy.mock.calls[0]?.[0] as string;
    expect(logged).toContain("\"level\":\"debug\"");

    spy.mockRestore();
  });
});
