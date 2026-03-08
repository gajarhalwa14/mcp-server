import { describe, it, expect } from "vitest";
import {
  buildQueryAndExplainPrompt,
  type QueryAndExplainArgs
} from "../../src/prompts/query-and-explain.js";

describe("query-and-explain prompt", () => {
  it("builds a prompt that mentions query_sqlite and db_path", () => {
    const args: QueryAndExplainArgs = {
      db_path: "/data/example.db",
      question: "What is the total number of users?",
      notes: "Main table is users"
    };

    const result = buildQueryAndExplainPrompt(args);

    expect(result.description).toMatch(/query_sqlite/i);
    expect(result.messages).toHaveLength(1);
    const [msg] = result.messages;
    expect(msg.role).toBe("user");
    if (msg.content.type !== "text") {
      throw new Error("expected text content");
    }
    expect(msg.content.text).toContain(args.db_path);
    expect(msg.content.text).toContain(args.question);
    expect(msg.content.text).toContain("query_sqlite");
  });
});

