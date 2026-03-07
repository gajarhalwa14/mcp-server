import { type LogLevel } from "../config/constants.js";

type LogSink = (line: string) => void;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export interface Logger {
  level: LogLevel;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  toolInvocation(
    toolName: string,
    inputSummary: Record<string, unknown>,
    durationMs: number,
    outcome: "success" | "error"
  ): void;
}

function shouldLog(level: LogLevel, current: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[current];
}

function write(
  sink: LogSink,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ?? {})
  };

  sink(`${JSON.stringify(payload)}\n`);
}

export function createLogger(
  level: LogLevel,
  sink: LogSink = (line) => {
    // Always log to stderr to avoid corrupting STDIO JSON-RPC framing.
    process.stderr.write(line);
  }
): Logger {
  const currentLevel = level;

  return {
    level: currentLevel,
    debug(message, meta) {
      if (shouldLog("debug", currentLevel)) {
        write(sink, "debug", message, meta);
      }
    },
    info(message, meta) {
      if (shouldLog("info", currentLevel)) {
        write(sink, "info", message, meta);
      }
    },
    warn(message, meta) {
      if (shouldLog("warn", currentLevel)) {
        write(sink, "warn", message, meta);
      }
    },
    error(message, meta) {
      if (shouldLog("error", currentLevel)) {
        write(sink, "error", message, meta);
      }
    },
    toolInvocation(toolName, inputSummary, durationMs, outcome) {
      if (shouldLog("info", currentLevel)) {
        write(sink, "info", "tool_invocation", {
          tool: toolName,
          input_summary: inputSummary,
          duration_ms: durationMs,
          outcome
        });
      }
    }
  };
}

