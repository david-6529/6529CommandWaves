import { describe, expect, it } from "vitest";
import { createContributionReport } from "./contribution-report";
import { createDeveloperFeePlan, createDeveloperFeePlanDraft } from "./developer-fee-plan";
import { demoWave } from "./demo-wave";

describe("developer fee plan", () => {
  it("summarizes reviewed work without creating payment authority", () => {
    const report = createContributionReport(demoWave, { generatedAt: "2026-06-20T18:00:00.000Z" });
    const plan = createDeveloperFeePlan(demoWave, report);

    expect(plan.mode).toBe("manual_review");
    expect(plan.summary).toContain("1 reviewed command");
    expect(plan.summary).toContain("visible contributors");
    expect(plan.requiredDecisions).toContain("Wave approves the fee budget before any payment.");
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

    expect(plan.summary).toBe("Manual fee planning starts after a reviewed command exists.");
  });

  it("creates a manual fee plan draft without payment authority", () => {
    const report = createContributionReport(demoWave, { generatedAt: "2026-06-20T18:00:00.000Z" });
    const draft = createDeveloperFeePlanDraft(demoWave, report);

    expect(draft).toContain("6529 hook developer fee plan");
    expect(draft).toContain(`6529 discussion: ${demoWave.waveUrl}`);
    expect(draft).toContain("Evidence for human review:");
    expect(draft).toContain("- Contribution report rationale.");
    expect(draft).toContain("Visible contributors for review:");
    expect(draft).toContain("- david: report score");
    expect(draft).toContain("Decisions needed:");
    expect(draft).toContain("- Wave approves the fee budget before any payment.");
    expect(draft).toContain("Blocked in this app:");
    expect(draft).toContain("- No automatic payouts.");
    expect(draft).toContain("does not move funds, choose recipients, set amounts, grant REP or TDH, or create payment authority");
    expect(draft).not.toContain("\u2014");
  });
});
