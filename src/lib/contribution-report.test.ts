import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createContributionReport, createContributionReportDraft } from "./contribution-report";

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
    expect(report.coverage.included).toContain("Work proposals stored by this app.");
    expect(report.coverage.included).toContain("Recorded GitHub PR links and Guardian review proof.");
    expect(report.coverage.notIncluded).toContain("Live wave posts that have not been pulled into app state.");
    expect(report.coverage.notIncluded).toContain("Manual payments, REP, TDH, off-app agreements, or private coordination.");
    expect(report.scoringRubric).toEqual([
      "Complete proposal: 6 report points.",
      "Reviewing proposal: 4 report points.",
      "Other proposal: 3 report points.",
      "6529 decision receipt: 2 report points.",
      "Vote or attributed activity log event: 1 report point.",
    ]);
    expect(report.evidence).toContain("1 GitHub PR link");
    expect(report.evidence).toContain("1 Guardian review proof");
    expect(report.contributors[0]).toMatchObject({
      identity: "david",
      score: 10,
      scoreBasis: [
        "Proposal work: 6 report points",
        "Decision receipts: 2 report points",
        "Votes: 1 report point",
        "Activity log: 1 report point",
      ],
      proposals: 1,
      decisions: 1,
    });
    expect(report.contributors[0].rationale).toContain("Recorded 6529 decision evidence");
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

  it("creates a copyable report draft without granting authority", () => {
    const draft = createContributionReportDraft(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
      limit: 2,
    });

    expect(draft).toContain("6529 hook contribution report");
    expect(draft).toContain("Generated: 2026-06-21T12:00:00.000Z");
    expect(draft).toContain("Evidence:");
    expect(draft).toContain("- 1 GitHub PR link");
    expect(draft).toContain("Coverage included:");
    expect(draft).toContain("- Work proposals stored by this app.");
    expect(draft).toContain("Not included:");
    expect(draft).toContain("- Live wave posts that have not been pulled into app state.");
    expect(draft).toContain("Contributors:");
    expect(draft).toContain("- david: report score");
    expect(draft).toContain("Proposal work: 6 report points");
    expect(draft).toContain("Decision receipts: 2 report points");
    expect(draft).toContain("Report scores are an AI-readable activity report, not a permission system.");
    expect(draft).toContain("REP, TDH, payouts, and merge rights must use separate human-approved rules.");
    expect(draft).not.toContain("\u2014");
  });
});
