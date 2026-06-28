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
});
