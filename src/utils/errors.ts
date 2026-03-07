export interface ToolErrorInfo {
  code: string;
  message: string;
}

export class ToolExecutionError extends Error {
  readonly code: string;

  constructor(message: string, code = "TOOL_EXECUTION_ERROR") {
    super(message);
    this.name = "ToolExecutionError";
    this.code = code;
  }
}

export class PermissionError extends ToolExecutionError {
  constructor(message = "Permission denied") {
    super(message, "PERMISSION_DENIED");
    this.name = "PermissionError";
  }
}

export class FileTooLargeError extends ToolExecutionError {
  constructor(message = "File is too large") {
    super(message, "FILE_TOO_LARGE");
    this.name = "FileTooLargeError";
  }
}

export class NonSelectQueryError extends ToolExecutionError {
  constructor(message = "Only SELECT statements are allowed") {
    super(message, "NON_SELECT_QUERY");
    this.name = "NonSelectQueryError";
  }
}

export class QueryTimeoutError extends ToolExecutionError {
  constructor(message = "Query timed out") {
    super(message, "QUERY_TIMEOUT");
    this.name = "QueryTimeoutError";
  }
}

export function toToolErrorInfo(error: unknown): ToolErrorInfo {
  if (error instanceof ToolExecutionError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: "UNEXPECTED_ERROR", message: error.message };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unknown error occurred"
  };
}

