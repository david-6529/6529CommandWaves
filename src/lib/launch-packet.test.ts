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
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(packet).toMatchObject({
      version: "command-wave-launch-packet-v0.1",
      proposalId: proposal.id,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    expect(packet.text).toContain("# 6529 Hook Builder launch packet");
    expect(packet.text).toContain("Status: human-reviewed draft");
    expect(packet.text).toContain("Participation notes (advisory):");
    expect(packet.text).toContain("manual note only");
    expect(packet.text).toContain("Wave decision receipt:");
    expect(packet.text).toContain("Review proof:");
    expect(packet.text).toContain("## Contribution Report");
    expect(packet.text).toContain("Complete proposal: 6 points.");
    expect(packet.text).toContain("Wave decision receipt: 2 points.");
    expect(packet.text).toContain("1 Guardian review proof");
    expect(packet.text).toContain("## Developer Fee Evidence");
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
    expect(packet.text).toContain("Build: waiting for an approved PR command.");
    expect(packet.text).toContain("Review: waiting for execution evidence.");
    expect(packet.text).toContain("Choose one PR-sized hook command.");
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

  it("keeps local vote approval waiting for a wave decision receipt", () => {
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

    expect(packet.text).toContain("Wave decision receipt: not recorded yet.");
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
