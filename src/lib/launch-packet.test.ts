import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createLaunchPacket } from "./launch-packet";

describe("launch packet", () => {
  it("creates a human-reviewed packet for the hook launch", () => {
    const proposal = demoWave.proposals[0];
    const packet = createLaunchPacket({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
      execution: demoWave.executions[0],
      review: demoWave.reviews[0],
      verificationTargets: {
        setupProofUrl: "https://hooks.example/api/command-wave/setup/proof",
        commandWaveStateUrl: "https://hooks.example/api/command-wave/state",
        launchAuditUrl: "https://hooks.example/api/command-wave/launch/audit",
      },
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(packet).toMatchObject({
      version: "command-wave-launch-packet-v0.1",
      proposalId: proposal.id,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    expect(packet.text).toContain("# 6529 hook launch packet");
    expect(packet.text).toContain("Status: human-reviewed draft");
    expect(packet.text).toContain("Participation notes (advisory):");
    expect(packet.text).toContain("manual note only");
    expect(packet.text).toContain("## Orchestration");
    expect(packet.text).toContain("- Work type: Open PR");
    expect(packet.text).toContain("- Risk: high");
    expect(packet.text).toContain("- Decision route: vote required, quorum 3, yes threshold 60%, decision receipt recorded.");
    expect(packet.text).toContain("- Rule reason: Code changes need visible approval before execution.");
    expect(packet.text).toContain("Reviewer CI checks the PR manifest, rules, risk, hook guardrails, and evidence");
    expect(packet.text).toContain("6529 decision receipt:");
    expect(packet.text).toContain("Review proof:");
    expect(packet.text).toContain("## Contribution Report");
    expect(packet.text).toContain("Complete proposal: 6 report points.");
    expect(packet.text).toContain("6529 decision receipt: 2 report points.");
    expect(packet.text).toContain("david: report score 10");
    expect(packet.text).toContain("Proposal work: 6 report points");
    expect(packet.text).toContain("Decision receipts: 2 report points");
    expect(packet.text).toContain("1 Guardian review proof");
    expect(packet.text).toContain("## Developer Fee Evidence");
    expect(packet.text).toContain("## Verification");
    expect(packet.text).toContain("Setup proof: https://hooks.example/api/command-wave/setup/proof");
    expect(packet.text).toContain("Command-wave state: https://hooks.example/api/command-wave/state");
    expect(packet.text).toContain("Launch audit: https://hooks.example/api/command-wave/launch/audit");
    expect(packet.text).toContain("SETUP_PROOF_URL=https://hooks.example/api/command-wave/setup/proof npm run setup:verify");
    expect(packet.text).toContain("Run manifest recorded.");
    expect(packet.text).toContain("PR manifest in body.");
    expect(packet.text).toContain("PR link: https://github.com/6529-Collections/6529-hook/pull/12");
    expect(packet.text).toContain("Head commit recorded.");
    expect(packet.text).toContain("forge test passed");
    expect(packet.text).not.toContain("run-manifest:{");
    expect(packet.text).toContain("No automatic payouts.");
    expect(packet.text).toContain("This packet does not grant REP, TDH, payouts, permissions, or merge rights.");
    expect(packet.text).toContain("Post this packet to the builder wave after human review");
    expect(packet.text).not.toContain("automatically posted");
    expect(packet.text).not.toContain("\u2014");
  });

  it("handles setup before a command exists", () => {
    const packet = createLaunchPacket({
      wave: {
        ...demoWave,
        proposals: [],
        polls: [],
        executions: [],
        reviews: [],
      },
      proposal: null,
      poll: null,
      execution: null,
      review: null,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(packet.proposalId).toBeNull();
    expect(packet.text).toContain("Command: none selected yet.");
    expect(packet.text).toContain("Work type: No command selected");
    expect(packet.text).toContain("Risk: waiting");
    expect(packet.text).toContain("Decision route: waiting for one scoped hook command.");
    expect(packet.text).toContain("Reviewer route: PR work needs reviewer CI before human merge.");
    expect(packet.text).toContain("Build: waiting for an approved PR command.");
    expect(packet.text).toContain("Review: waiting for execution evidence.");
    expect(packet.text).toContain("Choose one PR-sized hook command.");
    expect(packet.text).toContain("Setup proof: not attached.");
    expect(packet.text).toContain("Command-wave state: not attached.");
  });

  it("labels discussion update support commands without implying automatic posting", () => {
    const proposal = {
      ...demoWave.proposals[0],
      id: "cmd-wave-update",
      title: "Draft discussion update",
      kind: "post_to_wave" as const,
      risk: "medium" as const,
      status: "approved" as const,
      prompt: "Draft an update for human posting.",
      spec: "Do not post automatically.",
    };
    const packet = createLaunchPacket({
      wave: {
        ...demoWave,
        proposals: [proposal],
        polls: [],
        executions: [],
        reviews: [],
      },
      proposal,
      poll: null,
      execution: null,
      review: null,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(packet.text).toContain("- Kind: Discussion update");
    expect(packet.text).not.toContain("- Kind: post to wave");
    expect(packet.text).not.toContain("automatically posted");
  });

  it("does not imply empty participation notes are enforced gates", () => {
    const packet = createLaunchPacket({
      wave: {
        ...demoWave,
        gates: [],
      },
      proposal: null,
      poll: null,
      execution: null,
      review: null,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(packet.text).toContain("Participation notes (advisory): none recorded");
    expect(packet.text).not.toContain("Participation gate:");
  });

  it("keeps local vote approval waiting for a 6529 decision receipt", () => {
    const packet = createLaunchPacket({
      wave: demoWave,
      proposal: {
        ...demoWave.proposals[0],
        status: "ready_for_vote",
      },
      poll: {
        ...demoWave.polls[0],
        decision: null,
      },
      execution: null,
      review: null,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(packet.text).toContain("6529 decision receipt: not recorded yet.");
    expect(packet.text).toContain("Build: waiting for a recorded wave decision.");
  });

  it("defaults generatedAt to the newest ledger event", () => {
    const packet = createLaunchPacket({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: demoWave.polls[0],
      execution: demoWave.executions[0],
      review: demoWave.reviews[0],
    });

    expect(packet.generatedAt).toBe("2026-06-20T12:50:00.000Z");
    expect(packet.text).toContain("Generated: 2026-06-20T12:50:00.000Z");
  });
});
