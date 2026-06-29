import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createCodexWorkPacket } from "./codex-work-packet";

describe("Codex work packet", () => {
  it("creates a manual Codex packet for approved PR work", () => {
    const proposal = demoWave.proposals[0];
    const packet = createCodexWorkPacket({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
    });

    expect(packet).toMatchObject({
      version: "command-wave-codex-work-v0.1",
      mode: "manual_codex",
      proposalId: proposal.id,
      targetBranch: "command/cmd-001-draft-the-non-upgradeable-hook-scaffold",
    });
    expect(packet.packetHash).toHaveLength(64);
    expect(packet.textHash).toHaveLength(64);
    expect(packet.text).toContain("Command Waves Codex work packet");
    expect(packet.text).toContain("Work in an isolated clone or worktree");
    expect(packet.text).toContain("Put the Command Waves manifest below in the PR body.");
    expect(packet.text).toContain("Do not merge PRs.");
    expect(packet.text).toContain("Do not deploy contracts.");
    expect(packet.text).toContain("Do not spend funds.");
    expect(packet.text).toContain("drop-cmd-001-approval");
    expect(packet.text).not.toContain("\u2014");
  });

  it("requires a 6529 decision receipt for PR work packets", () => {
    const proposal = {
      ...demoWave.proposals[0],
      status: "approved" as const,
    };
    const poll = {
      ...demoWave.polls[0],
      decision: null,
    };

    expect(() =>
      createCodexWorkPacket({
        wave: demoWave,
        proposal,
        poll,
      }),
    ).toThrow("Record the 6529 decision receipt before creating a Codex work packet.");
  });

  it("requires a 6529 discussion URL for PR work packet receipts", () => {
    const proposal = {
      ...demoWave.proposals[0],
      status: "approved" as const,
    };
    const poll = {
      ...demoWave.polls[0],
      decision: {
        ...demoWave.polls[0].decision!,
        dropId: "drop-cmd-001-approval",
        url: null,
      },
    };

    expect(() =>
      createCodexWorkPacket({
        wave: demoWave,
        proposal,
        poll,
      }),
    ).toThrow("Record the 6529 decision receipt before creating a Codex work packet.");
  });
});
