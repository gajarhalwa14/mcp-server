import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { ensurePathAllowed } from "../../src/utils/path-guard.js";
import { PermissionError } from "../../src/utils/errors.js";

describe("path-guard", () => {
  const tmpDir = os.tmpdir();
  const allowedDirs = [tmpDir];

  it("allows paths within allowed directories", () => {
    const subPath = path.join(tmpDir, "foo", "bar.txt");
    const resolved = ensurePathAllowed(subPath, allowedDirs);
    expect(resolved).toBeDefined();
    expect(path.isAbsolute(resolved)).toBe(true);
  });

  it("allows the allowed directory itself", () => {
    const resolved = ensurePathAllowed(tmpDir, allowedDirs);
    expect(resolved).toBeDefined();
  });

  it("throws PermissionError for paths outside allowed dirs", () => {
    expect(() =>
      ensurePathAllowed("/some/other/path", allowedDirs)
    ).toThrow(PermissionError);

    expect(() =>
      ensurePathAllowed(path.join(tmpDir, "..", "etc", "passwd"), allowedDirs)
    ).toThrow(PermissionError);
  });

  it("throws for empty path", () => {
    expect(() => ensurePathAllowed("", allowedDirs)).toThrow(PermissionError);
  });

  it("throws when no allowed dirs configured", () => {
    expect(() => ensurePathAllowed(tmpDir, [])).toThrow(PermissionError);
  });

  it("resolves relative paths against cwd", () => {
    const relPath = path.relative(process.cwd(), path.join(tmpDir, "rel.txt"));
    const resolved = ensurePathAllowed(relPath, allowedDirs);
    expect(resolved).toBeDefined();
    expect(resolved).toContain(tmpDir);
  });
});
