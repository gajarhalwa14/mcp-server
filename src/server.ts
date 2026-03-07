import { loadConfig } from "./config/env.js";

/**
 * Starts the MCP server.
 *
 * For now this only validates configuration; the transport and tool wiring
 * will be added in later implementation steps.
 */
export async function start(
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  try {
    loadConfig(env);
    // TODO: wire up MCP server, tools, resources, prompts, and transports.
  } catch (error) {
    console.error(
      "Failed to start MCP server due to invalid configuration:",
      error
    );
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(() => {
    process.exit(1);
  });
}

