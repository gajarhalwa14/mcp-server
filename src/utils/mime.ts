const EXTENSION_MIME: Record<string, string> = {
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".htm": "text/html",
  ".xml": "application/xml",
  ".log": "text/plain",
  ".yml": "text/yaml",
  ".yaml": "text/yaml",
  ".ts": "text/typescript",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".cjs": "application/javascript"
};

export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}
