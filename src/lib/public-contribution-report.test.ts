import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicContributionReport, publicContributionReportHashInput } from "./public-contribution-report";
import { hashValue } from "./run-manifest";

describe("public contribution report", () => {
  it("publishes a hashable informational report without granting authority", () => {
    const report = createPublicContributionReport(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
    });

    expect(report).toMatchObject({
      version: "command-wave-contribution-report-v0.1",
      generatedAt: "2026-06-20T13:00:00.000Z",
      project: {
        id: demoWave.id,
        name: demoWave.name,
        waveUrl: demoWave.waveUrl,
        repo: {
          status: "placeholder",
          label: "GitHub repo placeholder",
          url: null,
        },
      },
      agents: {
        orchestrator: {
          handle: "daemon",
          status: "active",
        },
        reviewer: {
          handle: "review-agent",
          status: "placeholder",
        },
      },
      authority: {
        mode: "informational",
        sourceOfTruth: "project chat",
        doesNotGrant: ["Access", "Payouts", "Merge rights", "Reputation", "Token weight"],
        requiresHumanApproval: ["Access changes", "Merges", "Payments", "Governance changes"],
      },
      report: {
        mode: "informational",
        method: {
          id: "visible_activity_v0",
          authority: "Informational only",
        },
      },
    });
    expect(report.reportHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.reportHash).toBe(hashValue(publicContributionReportHashInput(report)));
    expect(JSON.stringify(report)).not.toContain("https://github.com/6529-Collections/6529-hook");
    expect(JSON.stringify(report)).not.toContain("\u2014");
  });

  it("publishes a configured repo only after the project repo is selected", () => {
    const report = createPublicContributionReport(
      {
        ...demoWave,
        repoUrl: "https://github.com/builders/hook",
      },
      {
        generatedAt: "2026-06-20T13:00:00.000Z",
      },
    );

    expect(report.project.repo).toEqual({
      status: "configured",
      label: "GitHub repo configured",
      url: "https://github.com/builders/hook",
    });
    expect(report.reportHash).toBe(hashValue(publicContributionReportHashInput(report)));
  });
});
