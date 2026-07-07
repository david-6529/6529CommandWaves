import { describe, expect, it } from "vitest";
import {
  defaultLocalAppUrl,
  launchAuditRemoteEnabled,
  launchAuditUrlFromAppUrl,
  setupProofUrlFromAppUrl,
} from "./launch-audit-url";

describe("launch audit URL", () => {
  it("uses the remote launch audit path by default", () => {
    expect(launchAuditUrlFromAppUrl("https://command-waves.example.com/")).toBe(
      "https://command-waves.example.com/api/command-wave/launch/audit?remote=1",
    );
  });

  it("can build a shape-only launch audit URL for local diagnostics", () => {
    expect(launchAuditUrlFromAppUrl("http://localhost:5001", { remote: false })).toBe(
      "http://localhost:5001/api/command-wave/launch/audit",
    );
  });

  it("treats LAUNCH_AUDIT_REMOTE=0 as the only opt-out", () => {
    expect(launchAuditRemoteEnabled(undefined)).toBe(true);
    expect(launchAuditRemoteEnabled("1")).toBe(true);
    expect(launchAuditRemoteEnabled("0")).toBe(false);
  });

  it("returns null without an app URL", () => {
    expect(launchAuditUrlFromAppUrl(" ")).toBeNull();
  });

  it("defines the local verifier fallback URL", () => {
    expect(defaultLocalAppUrl).toBe("http://localhost:5001");
    expect(launchAuditUrlFromAppUrl(defaultLocalAppUrl, { remote: false })).toBe(
      "http://localhost:5001/api/command-wave/launch/audit",
    );
    expect(setupProofUrlFromAppUrl(defaultLocalAppUrl)).toBe("http://localhost:5001/api/command-wave/setup/proof");
  });

  it("builds setup proof URLs from deployed app URLs", () => {
    expect(setupProofUrlFromAppUrl("https://command-waves.example.com/")).toBe(
      "https://command-waves.example.com/api/command-wave/setup/proof",
    );
    expect(setupProofUrlFromAppUrl(" ")).toBeNull();
  });

  it("does not emit em dash characters", () => {
    expect(
      JSON.stringify({
        defaultLocalAppUrl,
        launchAuditUrl: launchAuditUrlFromAppUrl("https://command-waves.example.com/"),
      }),
    ).not.toContain("\u2014");
  });
});
