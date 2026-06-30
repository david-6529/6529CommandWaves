import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createBuilderWaveProposalDraft } from "./builder-wave-proposal-draft";

describe("6529 discussion proposal draft", () => {
  it("creates a concise hook proposal post", () => {
    const draft = createBuilderWaveProposalDraft({
      wave: demoWave,
      title: "Draft hook scaffold",
      proposer: "david",
      kind: "open_pr",
      request: "Use Codex to draft the hook scaffold.",
      limits: "No proxy, no deploy script, and include tests.",
      budgetUsd: "10",
      risk: "high",
      decisionRoute: "needs vote",
      ruleReason: "Code changes need visible approval before execution.",
    });

    expect(draft).toContain("Hook change proposal");
    expect(draft).toContain("Change: Draft hook scaffold");
    expect(draft).toContain(`Discussion: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("What I want to change:");
    expect(draft).toContain("Limits and tests:");
    expect(draft).toContain("Decision:");
    expect(draft).toContain("Please approve, reject, or ask for edits before any PR work starts.");
    expect(draft).toContain("Safety:");
    expect(draft).toContain("- Open PR, high risk, needs vote.");
    expect(draft).toContain("- Code changes need visible approval before execution.");
    expect(draft).toContain("No deploy, payout, proxy, delegatecall, governance change");
    expect(draft).not.toContain("\u2014");
  });

  it("uses readable fallbacks for empty fields", () => {
    const draft = createBuilderWaveProposalDraft({
      wave: demoWave,
      title: "",
      proposer: "",
      kind: "draft_response",
      request: "",
      limits: "",
      budgetUsd: "",
      risk: "",
      decisionRoute: "",
      ruleReason: "",
    });

    expect(draft).toContain("Hook question");
    expect(draft).toContain("Proposer: unknown");
    expect(draft).toContain("Change: Untitled hook work");
    expect(draft).toContain("Question:");
    expect(draft).toContain("Answer limits:");
    expect(draft).toContain("No request written yet.");
    expect(draft).toContain("No limits written yet.");
    expect(draft).toContain("Please answer, approve, or ask for edits in the room.");
    expect(draft).toContain("Budget cap: 0 USD");
    expect(draft).toContain("- Draft response, unknown risk, needs review.");
    expect(draft).toContain("- No rule reason recorded.");
  });

  it("uses non-PR decision language for room updates", () => {
    const draft = createBuilderWaveProposalDraft({
      wave: demoWave,
      title: "Share status",
      proposer: "david",
      kind: "post_to_wave",
      request: "Draft the room status.",
      limits: "Do not claim approval unless recorded.",
      budgetUsd: "0",
      risk: "low",
      decisionRoute: "can run",
      ruleReason: "Discussion updates are support work.",
    });

    expect(draft).toContain("Hook room update");
    expect(draft).toContain("Update needed:");
    expect(draft).toContain("Posting limits:");
    expect(draft).toContain("Please approve, reject, or ask for edits before this is shared.");
    expect(draft).not.toContain("before any PR work starts");
    expect(draft).not.toContain("\u2014");
  });
});
