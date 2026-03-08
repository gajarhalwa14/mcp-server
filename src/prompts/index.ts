import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  analyseFileArgsSchema,
  buildAnalyseFilePrompt,
  type AnalyseFileArgs
} from "./analyse-file.js";
import {
  queryAndExplainArgsSchema,
  buildQueryAndExplainPrompt,
  type QueryAndExplainArgs
} from "./query-and-explain.js";

export function registerPrompts(server: McpServer): void {
  const s: any = server;

  s.registerPrompt(
    "analyse-file",
    {
      title: "Analyse file",
      description:
        "Analyse a file by first calling the read_file MCP tool, then returning a structured summary and recommendations.",
      argsSchema: analyseFileArgsSchema
    },
    (args: AnalyseFileArgs) => buildAnalyseFilePrompt(args)
  );

  s.registerPrompt(
    "query-and-explain",
    {
      title: "Query and explain",
      description:
        "Answer a natural-language question by querying a SQLite database with query_sqlite, then explain the results in plain language.",
      argsSchema: queryAndExplainArgsSchema
    },
    (args: QueryAndExplainArgs) => buildQueryAndExplainPrompt(args)
  );
}

