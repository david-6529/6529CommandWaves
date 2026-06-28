import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createContributionReport } from "./contribution-report";

describe("contribution report", () => {
  it("summarizes visible activity without granting authority", () => {
    const report = createContributionReport(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(report).toMatchObject({
      mode: "informational",
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    expect(report.notes.join(" ")).toContain("not a permission system");
    expect(report.notes.join(" ")).toContain("REP, TDH, payouts, and merge rights");
    expect(report.notes.join(" ")).toContain("decision receipts");
    expect(report.contributors[0]).toMatchObject({
      identity: "david",
      proposals: 1,
      decisions: 1,
    });
    expect(report.contributors[0].rationale).toContain("Recorded wave decision evidence");
    expect(report.contributors.some((contributor) => contributor.votes > 0)).toBe(true);
  });
});
