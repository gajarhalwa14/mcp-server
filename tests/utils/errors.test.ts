import { describe, it, expect } from "vitest";
import {
  PermissionError,
  FileTooLargeError,
  NonSelectQueryError,
  QueryTimeoutError,
  ToolExecutionError,
  toToolErrorInfo
} from "../../src/utils/errors.js";

describe("errors", () => {
  it("exposes stable codes and messages for tool errors", () => {
    expect(new PermissionError().code).toBe("PERMISSION_DENIED");
    expect(new PermissionError("custom").message).toBe("custom");

    expect(new FileTooLargeError().code).toBe("FILE_TOO_LARGE");
    expect(new NonSelectQueryError().code).toBe("NON_SELECT_QUERY");
    expect(new QueryTimeoutError().code).toBe("QUERY_TIMEOUT");
  });

  it("toToolErrorInfo maps ToolExecutionError to code and message", () => {
    const err = new PermissionError("denied");
    expect(toToolErrorInfo(err)).toEqual({
      code: "PERMISSION_DENIED",
      message: "denied"
    });
  });

  it("toToolErrorInfo maps generic Error to UNEXPECTED_ERROR", () => {
    expect(toToolErrorInfo(new Error("oops"))).toEqual({
      code: "UNEXPECTED_ERROR",
      message: "oops"
    });
  });

  it("toToolErrorInfo maps unknown to UNKNOWN_ERROR", () => {
    expect(toToolErrorInfo("string")).toEqual({
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred"
    });
  });
});
