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
    expect(report.notes.join(" ")).toContain("Report scores are an AI-readable activity report");
    expect(report.notes.join(" ")).toContain("REP, TDH, payouts, and merge rights");
    expect(report.notes.join(" ")).toContain("review, and ledger evidence");
    expect(report.scoringRubric).toEqual([
      "Complete proposal: 6 report points.",
      "Reviewing proposal: 4 report points.",
      "Other proposal: 3 report points.",
      "Wave decision receipt: 2 report points.",
      "Vote or attributed activity log event: 1 report point.",
    ]);
    expect(report.evidence).toContain("1 GitHub PR link");
    expect(report.evidence).toContain("1 Guardian review proof");
    expect(report.contributors[0]).toMatchObject({
      identity: "david",
      proposals: 1,
      decisions: 1,
    });
    expect(report.contributors[0].rationale).toContain("Recorded wave decision evidence");
    expect(report.contributors.some((contributor) => contributor.votes > 0)).toBe(true);
  });

  it("defaults generatedAt to the newest ledger event", () => {
    const report = createContributionReport(demoWave);

    expect(report.generatedAt).toBe("2026-06-20T12:50:00.000Z");
  });

  it("reports no evidence before app activity exists", () => {
    const report = createContributionReport({
      ...demoWave,
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(report.summary).toBe("No contributor activity has been recorded yet.");
    expect(report.evidence).toEqual(["No app evidence recorded yet."]);
  });
});
