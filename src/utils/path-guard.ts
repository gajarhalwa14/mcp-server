import fs from "fs";
import path from "path";
import { PermissionError } from "./errors.js";

function normalizeDir(dir: string): string {
  const resolved = path.resolve(dir);
  return path.normalize(resolved);
}

export function ensurePathAllowed(
  rawPath: string,
  allowedDirs: string[]
): string {
  if (!rawPath) {
    throw new PermissionError("Path is empty");
  }

  if (allowedDirs.length === 0) {
    throw new PermissionError("No allowed directories configured");
  }

  const resolvedPath = path.resolve(rawPath);

  // Resolve symlinks when the path exists, otherwise fall back to the
  // resolved path so we can still give a useful permission error.
  const realPath = fs.existsSync(resolvedPath)
    ? fs.realpathSync(resolvedPath)
    : resolvedPath;

  const normalizedRealPath = path.normalize(realPath);
  const normalizedAllowed = allowedDirs.map((dir) => normalizeDir(dir));

  const isWithinAllowed = normalizedAllowed.some((allowed) => {
    if (normalizedRealPath === allowed) {
      return true;
    }

    const prefix = allowed.endsWith(path.sep)
      ? allowed
      : `${allowed}${path.sep}`;

    return normalizedRealPath.startsWith(prefix);
  });

  if (!isWithinAllowed) {
    throw new PermissionError(
      `Access to path '${normalizedRealPath}' is not permitted`
    );
  }

  return normalizedRealPath;
}

