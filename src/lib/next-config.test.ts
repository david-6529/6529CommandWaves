import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Next config", () => {
  it("sets baseline production security headers", async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((item) => item.source === "/:path*")?.headers ?? [];
    const values = Object.fromEntries(globalHeaders.map((item) => [item.key, item.value]));

    expect(nextConfig.poweredByHeader).toBe(false);
    expect(values).toMatchObject({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    });
  });
});
