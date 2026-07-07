import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createLaunchPacket } from "./launch-packet";
import { hashValue } from "./run-manifest";

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
        projectIndexUrl: "https://hooks.example/api/command-wave/projects",
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
    expect(packet.packetHash).toBe(
      hashValue({
        version: packet.version,
        proposalId: packet.proposalId,
        generatedAt: packet.generatedAt,
        text: packet.text,
      }),
    );
    expect(packet.text).toContain("# Project launch packet");
    expect(packet.text).toContain("Status: human-reviewed draft");
    expect(packet.text).toContain("Repo: Placeholder repo (Connect the real hook repo before PR work can run.)");
    expect(packet.text).toContain("Participation notes (advisory):");
    expect(packet.text).toContain("Manual builder review for phase 1");
    expect(packet.text).toContain("## Orchestration");
    expect(packet.text).toContain("- Work type: Open PR");
    expect(packet.text).toContain("- Risk: high");
    expect(packet.text).toContain("- Decision route: vote required, quorum 3, yes threshold 60%, decision receipt recorded.");
    expect(packet.text).toContain("- Rule reason: Code changes need visible approval before execution.");
    expect(packet.text).toContain("Reviewer CI checks the PR manifest, rules, risk, hook guardrails, and records");
    expect(packet.text).toContain("Project decision receipt:");
    expect(packet.text).toContain("Review proof:");
    expect(packet.text).toContain("## Workflow Proof");
    expect(packet.text).toContain("Summary: Public proof of the chat, decision, PR, review, and log path for the first hook build.");
    expect(packet.text).toContain("Source of truth: project chat");
    expect(packet.text).toContain("Code surface: GitHub PR");
    expect(packet.text).toContain("Project chat: ready.");
    expect(packet.text).toContain("Decision: ready.");
    expect(packet.text).toContain("Pull request: blocked. GitHub repo is still a placeholder.");
    expect(packet.text).toContain("Review: blocked. Review waits for a real hook repo and PR record.");
    expect(packet.text).toContain("Log: ready.");
    expect(packet.text).toContain("## Contribution Report");
    expect(packet.text).toContain("Complete proposal: 6 report points.");
    expect(packet.text).toContain("Project decision receipt: 2 report points.");
    expect(packet.text).toContain("david: report score 10");
    expect(packet.text).toContain("Proposal work: 6 report points");
    expect(packet.text).toContain("Decision receipts: 2 report points");
    expect(packet.text).toContain("1 Guardian review proof");
    expect(packet.text).toContain("## Developer Fee Records");
    expect(packet.text).toContain("## Verification");
    expect(packet.text).toContain("Setup proof: https://hooks.example/api/command-wave/setup/proof");
    expect(packet.text).toContain("Project index: https://hooks.example/api/command-wave/projects");
    expect(packet.text).toContain("Command-wave state: https://hooks.example/api/command-wave/state");
    expect(packet.text).toContain("Launch audit: https://hooks.example/api/command-wave/launch/audit");
    expect(packet.text).toContain("SETUP_PROOF_URL=https://hooks.example/api/command-wave/setup/proof npm run setup:verify");
    expect(packet.text).toContain("Run manifest recorded.");
    expect(packet.text).toContain("PR manifest in body.");
    expect(packet.text).toContain(`PR link: ${demoWave.repoUrl}/pull/12`);
    expect(packet.text).toContain("Head commit recorded.");
    expect(packet.text).toContain("forge test passed");
    expect(packet.text).not.toContain("run-manifest:{");
    expect(packet.text).toContain("No automatic payouts.");
    expect(packet.text).toContain("This packet does not grant reputation, token weight, payouts, permissions, or merge rights.");
    expect(packet.text).toContain("Post this packet to chat after human review");
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
    expect(packet.text).toContain("Work: none selected yet.");
    expect(packet.text).toContain("Work type: No work selected");
    expect(packet.text).toContain("Risk: waiting");
    expect(packet.text).toContain("Decision route: waiting for one scoped hook change.");
    expect(packet.text).toContain("Reviewer route: PR work needs reviewer CI before human merge.");
    expect(packet.text).toContain("Build: waiting for an approved PR change.");
    expect(packet.text).toContain("Review: waiting for a PR record.");
    expect(packet.text).toContain("## Workflow Proof");
    expect(packet.text).toContain("Pull request: blocked. GitHub repo is still a placeholder.");
    expect(packet.text).toContain("Choose one PR-sized hook change.");
    expect(packet.text).toContain("Setup proof: not attached.");
    expect(packet.text).toContain("Command-wave state: not attached.");
  });

  it("labels discussion update support items without implying automatic posting", () => {
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

  it("keeps local vote approval waiting for a project decision receipt", () => {
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

    expect(packet.text).toContain("Project decision receipt: not recorded yet.");
    expect(packet.text).toContain("Build: waiting for a recorded project decision.");
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
