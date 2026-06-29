import { describe, expect, it } from "vitest";
import { createCommandOrchestrationSummary } from "./command-orchestration-summary";
import { demoWave } from "./demo-wave";

describe("command orchestration summary", () => {
  it("summarizes the submitted PR command route", () => {
    const summary = createCommandOrchestrationSummary({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: demoWave.polls[0],
    });

    expect(summary).toEqual({
      workType: "Open PR",
      risk: "high",
      decisionRoute: "vote required, quorum 3, yes threshold 60%, decision receipt recorded",
      ruleReason: "Code changes need visible approval before execution.",
      reviewerRoute: "Reviewer CI checks the PR manifest, rules, risk, hook guardrails, and evidence before human merge.",
    });
  });

  it("flags a recorded PR receipt from the wrong wave", () => {
    const summary = createCommandOrchestrationSummary({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: {
        ...demoWave.polls[0],
        decision: {
          ...demoWave.polls[0].decision!,
          url: "https://6529.io/waves/other-wave/drops/drop-cmd-001-approval",
        },
      },
    });

    expect(summary.decisionRoute).toBe(
      "vote required, quorum 3, yes threshold 60%, receipt needs fix: 6529 decision URL must match the configured discussion.",
    );
  });

  it("requires a 6529 drop URL for PR work receipts", () => {
    const summary = createCommandOrchestrationSummary({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: {
        ...demoWave.polls[0],
        decision: {
          ...demoWave.polls[0].decision!,
          url: null,
          dropId: "drop-cmd-001-approval",
        },
      },
    });

    expect(summary.decisionRoute).toBe(
      "vote required, quorum 3, yes threshold 60%, receipt needs fix: 6529 decision URL is required for PR work.",
    );
  });

  it("keeps support commands outside the PR review route", () => {
    const summary = createCommandOrchestrationSummary({
      wave: demoWave,
      proposal: {
        ...demoWave.proposals[0],
        kind: "draft_response",
        risk: "low",
      },
      poll: null,
    });

    expect(summary).toMatchObject({
      workType: "Draft response",
      risk: "low",
      decisionRoute: "allowed by current rules",
      ruleReason: "Drafting text does not publish or change external systems.",
      reviewerRoute: "Support commands stay outside the PR build step.",
    });
  });

  it("summarizes setup before a command exists", () => {
    const summary = createCommandOrchestrationSummary({
      wave: demoWave,
      proposal: null,
      poll: null,
    });

    expect(summary).toMatchObject({
      workType: "No command selected",
      risk: "waiting",
      decisionRoute: "waiting for one scoped hook command",
      ruleReason: "No rule applies until work is proposed.",
      reviewerRoute: "PR work needs reviewer CI before human merge.",
    });
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(createCommandOrchestrationSummary({ wave: demoWave, proposal: null, poll: null }))).not.toContain(
      "\u2014",
    );
  });
});
