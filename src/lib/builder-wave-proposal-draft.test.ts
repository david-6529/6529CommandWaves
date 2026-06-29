import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createBuilderWaveProposalDraft } from "./builder-wave-proposal-draft";

describe("builder wave proposal draft", () => {
  it("creates a concise wave-first proposal post", () => {
    const draft = createBuilderWaveProposalDraft({
      wave: demoWave,
      title: "Draft hook scaffold",
      proposer: "david",
      kind: "open_pr",
      request: "Use Codex to draft the hook scaffold.",
      limits: "No proxy, no deploy script, and include tests.",
      budgetUsd: "10",
    });

    expect(draft).toContain("6529 hook proposal");
    expect(draft).toContain(`Builder wave: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("Work type: Open PR");
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
    });

    expect(draft).toContain("Proposer: unknown");
    expect(draft).toContain("Title: Untitled hook work");
    expect(draft).toContain("No request written yet.");
    expect(draft).toContain("No limits written yet.");
    expect(draft).toContain("Budget cap: 0 USD");
  });
});
