import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createBuilderWaveProposalDraft } from "./builder-wave-proposal-draft";

describe("builder wave proposal draft", () => {
  it("creates a concise orchestration proposal post", () => {
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

    expect(draft).toContain("Swarm proposal");
    expect(draft).toContain("I want to propose one small change for the 6529 hook build.");
    expect(draft).toContain("Small change: Draft hook scaffold");
    expect(draft).toContain(`Builder wave: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("Work type: Open PR");
    expect(draft).toContain("What should happen:");
    expect(draft).toContain("How the app routes it:");
    expect(draft).toContain("Risk: high");
    expect(draft).toContain("Decision route: needs vote");
    expect(draft).toContain("Rule: Code changes need visible approval before execution.");
    expect(draft).toContain("Decision needed: approve, reject, or ask for edits");
    expect(draft).toContain("no deploy, payout, proxy, delegatecall, governance change");
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

    expect(draft).toContain("Proposer: unknown");
    expect(draft).toContain("Small change: Untitled hook work");
    expect(draft).toContain("No request written yet.");
    expect(draft).toContain("No limits written yet.");
    expect(draft).toContain("Budget cap: 0 USD");
    expect(draft).toContain("Risk: unknown");
    expect(draft).toContain("Decision route: needs review");
    expect(draft).toContain("Rule: No rule reason recorded.");
  });
});
