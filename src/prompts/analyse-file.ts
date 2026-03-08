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

export const analyseFileArgsSchema = {
  path: z
    .string()
    .describe("Absolute or relative path to the file to analyse"),
  goal: z
    .string()
    .optional()
    .describe(
      "Optional description of what you want to learn from the file (e.g. 'summarise', 'find errors', 'triage logs')."
    )
};

export type AnalyseFileArgs = {
  path: string;
  goal?: string;
};

export function buildAnalyseFilePrompt(
  args: AnalyseFileArgs
): GetPromptResult {
  const { path, goal } = args;

  const goalText = goal
    ? `\n\nAnalysis goal:\n- ${goal}`
    : "";

  const text = `You are an expert file and data analyst.

First, use the \`read_file\` MCP tool to load the contents of the file at this path:
- ${path}

Then, based on the file contents, produce a structured analysis with:
- A concise high-level summary
- Key details, anomalies, or potential issues
- Any data trends or patterns you notice
- Clear, actionable recommendations for the user
- Optional follow-up questions the user might want to explore next.${goalText}

If the file is very large, focus on the most relevant sections and clearly state any limitations due to truncation. Always ground your analysis in specific evidence from the file.`;

  return {
    description:
      "Analyse a file by first calling the read_file MCP tool, then returning a structured summary and recommendations.",
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

