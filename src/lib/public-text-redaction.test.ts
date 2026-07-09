import { describe, expect, it } from "vitest";
import { redactPublicText } from "./public-text-redaction";

describe("public text redaction", () => {
  it("redacts common credentials while preserving ordinary project text", () => {
    const redacted = redactPublicText(
      [
        "Please inspect the fee cap PR.",
        "token=abc1234567890",
        "Authorization: Bearer ghp_1234567890abcdefghijklmnopqrstuvwxyz",
        "private_key=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "https://example.test/path?access_token=live-token-123&ok=1",
      ].join(" "),
    );

    expect(redacted).toContain("Please inspect the fee cap PR.");
    expect(redacted).toContain("token=[redacted]");
    expect(redacted).toContain("Bearer [redacted]");
    expect(redacted).toContain("private_key=[redacted]");
    expect(redacted).toContain("access_token=[redacted]");
    expect(redacted).not.toContain("abc1234567890");
    expect(redacted).not.toContain("live-token-123");
    expect(redacted).not.toContain("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  });
});
