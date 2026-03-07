import fs from "fs";
import path from "path";
import { z } from "zod";
import { ensurePathAllowed } from "../utils/path-guard.js";
import { PermissionError, FileTooLargeError } from "../utils/errors.js";
import { getMimeType } from "../utils/mime.js";
import type { Logger } from "../utils/logger.js";
import type { AppConfig } from "../config/env.js";

const ReadFileInputSchema = z.object({
  path: z.string().describe("Absolute or relative path to the target file")
});

export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

export interface ReadFileResult {
  content: string;
  size_bytes: number;
  mime_type: string;
}

export class FileNotFoundError extends Error {
  constructor(message = "File not found") {
    super(message);
    this.name = "FileNotFoundError";
  }
}

export async function readFileHandler(
  input: unknown,
  config: AppConfig,
  logger: Logger
): Promise<ReadFileResult> {
  const start = Date.now();
  const parsed = ReadFileInputSchema.safeParse(input);

  if (!parsed.success) {
    const err = new Error(
      `Invalid input: ${JSON.stringify(parsed.error.format())}`
    );
    logger.toolInvocation(
      "read_file",
      { path: "[invalid]" },
      Date.now() - start,
      "error"
    );
    throw err;
  }

  const { path: rawPath } = parsed.data;

  try {
    ensurePathAllowed(rawPath, config.allowedDirs);
  } catch (e) {
    logger.toolInvocation(
      "read_file",
      { path: rawPath },
      Date.now() - start,
      "error"
    );
    throw e;
  }

  const resolvedPath = path.resolve(rawPath);

  if (!fs.existsSync(resolvedPath)) {
    logger.toolInvocation(
      "read_file",
      { path: rawPath },
      Date.now() - start,
      "error"
    );
    throw new FileNotFoundError(`File not found: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);

  if (!stat.isFile()) {
    logger.toolInvocation(
      "read_file",
      { path: rawPath },
      Date.now() - start,
      "error"
    );
    throw new FileNotFoundError(`Not a file: ${resolvedPath}`);
  }

  if (stat.size > config.maxFileBytes) {
    logger.toolInvocation(
      "read_file",
      { path: rawPath },
      Date.now() - start,
      "error"
    );
    throw new FileTooLargeError(
      `File size ${stat.size} exceeds limit of ${config.maxFileBytes} bytes`
    );
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  const mime_type = getMimeType(resolvedPath);

  logger.toolInvocation(
    "read_file",
    { path: rawPath },
    Date.now() - start,
    "success"
  );

  return {
    content,
    size_bytes: stat.size,
    mime_type
  };
}
