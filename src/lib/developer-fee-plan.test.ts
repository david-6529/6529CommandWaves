import { describe, expect, it } from "vitest";
import { createContributionReport } from "./contribution-report";
import { createDeveloperFeePlan, createDeveloperFeePlanDraft } from "./developer-fee-plan";
import { demoWave } from "./demo-wave";

const placeholderRepoText = "GitHub repo placeholder (The GitHub repo is a placeholder until the pilot repo is selected.)";

describe("developer fee plan", () => {
  it("waits for reviewer process before treating reviewed work as fee evidence", () => {
    const report = createContributionReport(demoWave, { generatedAt: "2026-06-20T18:00:00.000Z" });
    const plan = createDeveloperFeePlan(demoWave, report);

    expect(plan.mode).toBe("manual_review");
    expect(plan.summary).toBe("Manual fee planning starts after the reviewed PR loop is ready.");
    expect(plan.evidenceInputs).toContain("Reviewed PR loop record after reviewer process is selected.");
    expect(plan.requiredDecisions).toContain("Builders approve the fee budget before any payment.");
    expect(plan.blockedActions).toContain("No automatic payouts.");
    expect(plan.blockedActions).toContain("No score-to-payment conversion without a separate vote.");
  });

  it("waits for reviewed work before fee planning starts", () => {
    const wave = {
      ...demoWave,
      reviews: [],
    };
    const report = createContributionReport(wave, { generatedAt: "2026-06-20T18:00:00.000Z" });
    const plan = createDeveloperFeePlan(wave, report);

    expect(plan.summary).toBe("Manual fee planning starts after the reviewed PR loop is ready.");
  });

  it("creates a manual fee plan draft without payment authority", () => {
    const report = createContributionReport(demoWave, { generatedAt: "2026-06-20T18:00:00.000Z" });
    const draft = createDeveloperFeePlanDraft(demoWave, report);

    expect(draft).toContain("Project developer fee plan");
    expect(draft).toContain(`Project chat: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${placeholderRepoText}`);
    expect(draft).toContain("Manual fee planning starts after the reviewed PR loop is ready.");
    expect(draft).toContain("Records for human review:");
    expect(draft).toContain("- Contribution report rationale.");
    expect(draft).toContain("Visible contributors for review:");
    expect(draft).toContain("- david: report score");
    expect(draft).toContain("Decisions needed:");
    expect(draft).toContain("- Builders approve the fee budget before any payment.");
    expect(draft).toContain("Blocked in this app:");
    expect(draft).toContain("- No automatic payouts.");
    expect(draft).toContain("does not move funds, choose recipients, set amounts, grant reputation or token weight, or create payment authority");
    expect(draft).not.toContain("\u2014");
  });
});
