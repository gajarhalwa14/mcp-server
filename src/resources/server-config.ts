import type { AppConfig } from "../config/env.js";

export function getServerConfigContent(config: AppConfig): string {
  const payload = {
    transport: config.transport,
    port: config.port,
    logLevel: config.logLevel,
    allowedDirs: config.allowedDirs,
    maxFileBytes: config.maxFileBytes,
    sqliteMaxRows: config.sqliteMaxRows,
    queryTimeoutMs: config.queryTimeoutMs
  };

  return JSON.stringify(payload, null, 2);
}
