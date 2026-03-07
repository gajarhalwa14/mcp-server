import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  readFileHandler,
  FileNotFoundError
} from "../../src/tools/read-file.js";
import { PermissionError, FileTooLargeError } from "../../src/utils/errors.js";
import { createLogger } from "../../src/utils/logger.js";
import type { AppConfig } from "../../src/config/env.js";

describe("read_file tool", () => {
  const tmpDir = os.tmpdir();
  const allowedDirs = [tmpDir];
  const config: AppConfig = {
    transport: "stdio",
    port: 3000,
    logLevel: "info",
    allowedDirs,
    maxFileBytes: 1024,
    sqliteMaxRows: 500,
    queryTimeoutMs: 10000,
    configResourceUri: "config://server"
  };
  const logger = createLogger("info", () => {});

  it("reads a file within allowed dirs", async () => {
    const filePath = path.join(tmpDir, `read-file-test-${Date.now()}.txt`);
    const content = "hello world";
    fs.writeFileSync(filePath, content);

    try {
      const result = await readFileHandler(
        { path: filePath },
        config,
        logger
      );

      expect(result.content).toBe(content);
      expect(result.size_bytes).toBe(content.length);
      expect(result.mime_type).toBe("text/plain");
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("throws PermissionError for paths outside allowed dirs", async () => {
    await expect(
      readFileHandler({ path: "/etc/passwd" }, config, logger)
    ).rejects.toThrow(PermissionError);
  });

  it("throws FileNotFoundError for non-existent file", async () => {
    const badPath = path.join(tmpDir, `does-not-exist-${Date.now()}.txt`);

    await expect(
      readFileHandler({ path: badPath }, config, logger)
    ).rejects.toThrow(FileNotFoundError);
  });

  it("throws FileTooLargeError when file exceeds max size", async () => {
    const filePath = path.join(tmpDir, `large-file-${Date.now()}.txt`);
    const content = "x".repeat(2048);
    fs.writeFileSync(filePath, content);

    try {
      await expect(
        readFileHandler({ path: filePath }, config, logger)
      ).rejects.toThrow(FileTooLargeError);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("detects MIME type from extension", async () => {
    const filePath = path.join(tmpDir, `mime-test-${Date.now()}.json`);
    fs.writeFileSync(filePath, "{}");

    try {
      const result = await readFileHandler(
        { path: filePath },
        config,
        logger
      );
      expect(result.mime_type).toBe("application/json");
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});
