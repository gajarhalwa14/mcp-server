import { z } from "zod";

// Narrow GetPromptResult locally to avoid depending on SDK's types export path.
type GetPromptResult = {
  description?: string;
  messages: {
    role: "user" | "assistant";
    content:
      | { type: "text"; text: string }
      | { type: "image"; data: string; mimeType: string }
      | { type: "audio"; data: string; mimeType: string }
      | { type: "resource_link"; uri: string; name: string }
      | { type: "resource"; resource: unknown };
  }[];
};

export const queryAndExplainArgsSchema = {
  db_path: z
    .string()
    .describe(
      "Path to the SQLite database file to query with the query_sqlite tool"
    ),
  question: z
    .string()
    .describe(
      "Natural-language question you want answered using the data in the database"
    ),
  notes: z
    .string()
    .optional()
    .describe(
      "Optional extra context, such as which tables are most relevant or constraints to respect."
    )
};

export type QueryAndExplainArgs = {
  db_path: string;
  question: string;
  notes?: string;
};

export function buildQueryAndExplainPrompt(
  args: QueryAndExplainArgs
): GetPromptResult {
  const { db_path, question, notes } = args;

  const notesText = notes
    ? `\n\nAdditional analyst notes:\n- ${notes}`
    : "";

  const text = `You are an expert data analyst working with a local SQLite database.

Database path:
- ${db_path}

User question:
- ${question}${notesText}

Your task:
1. If helpful, read the \`schema://sqlite/{db_path}\` resource (via the server's sqlite-schema resource) to understand the available tables and columns before writing any SQL.
2. Use the \`query_sqlite\` MCP tool to run one or more safe SELECT-only queries against this database that will let you answer the question accurately.
3. After running the queries, carefully analyse the results and produce a clear, plain-language explanation that:
   - Answers the question directly
   - Highlights key figures, trends, and edge cases
   - Calls out any data quality concerns or limitations
4. When it helps, include the exact SQL you ran and briefly justify why each query was chosen.

Guidelines:
- Prefer a small number of well-chosen queries over many noisy ones.
- Never attempt mutating statements (INSERT/UPDATE/DELETE/PRAGMA/etc.) — only SELECT queries are allowed.
- If the schema or results are ambiguous, state your assumptions explicitly.`;

  return {
    description:
      "Use the query_sqlite tool to answer a natural-language question from a SQLite database, then explain the result clearly.",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text
        }
      }
    ]
  };
}

