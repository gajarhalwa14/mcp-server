import { describe, it, expect } from "vitest";
import {
  buildAnalyseFilePrompt,
  type AnalyseFileArgs
} from "../../src/prompts/analyse-file.js";

describe("analyse-file prompt", () => {
  it("builds a prompt that mentions read_file and the path", () => {
    const args: AnalyseFileArgs = {
      path: "/data/example.csv",
      goal: "summarise the data and highlight anomalies"
    };

    const result = buildAnalyseFilePrompt(args);

    expect(result.description).toMatch(/Analyse a file/i);
    expect(result.messages).toHaveLength(1);
    const [msg] = result.messages;
    expect(msg.role).toBe("user");
    if (msg.content.type !== "text") {
      throw new Error("expected text content");
    }
    expect(msg.content.text).toContain("read_file");
    expect(msg.content.text).toContain(args.path);
    expect(msg.content.text).toContain(args.goal);
  });
});

