import { describe, expect, it } from "vitest";
import { formatApiError } from "./api-error-copy";

describe("API error copy", () => {
  it("uses the API error when present", () => {
    expect(formatApiError({ error: "Wave search failed" }, "Fallback")).toBe("Wave search failed");
  });

  it("falls back when the API error is missing or empty", () => {
    expect(formatApiError({}, "Fallback")).toBe("Fallback");
    expect(formatApiError({ error: "   " }, "Fallback")).toBe("Fallback");
  });

  it("appends a visible error ID when present", () => {
    expect(formatApiError({ error: "Unexpected error", errorId: " abc123 " }, "Fallback")).toBe(
      "Unexpected error. Error ID: abc123.",
    );
    expect(formatApiError({ error: "Unexpected error.", errorId: "abc123" }, "Fallback")).toBe(
      "Unexpected error. Error ID: abc123.",
    );
  });
});
