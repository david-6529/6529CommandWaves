import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createCodexWorkPacket } from "./codex-work-packet";

const configuredDemoWave = {
  ...demoWave,
  repoUrl: "https://github.com/6529-Collections/6529-hook",
};

describe("Codex work packet", () => {
  it("creates a manual Codex packet for approved PR work", () => {
    const proposal = configuredDemoWave.proposals[0];
    const packet = createCodexWorkPacket({
      wave: configuredDemoWave,
      proposal,
      poll: configuredDemoWave.polls[0],
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
    expect(packet.text).toContain("Repo: https://github.com/6529-Collections/6529-hook");
    expect(packet.text).toContain("Work in an isolated clone or worktree");
    expect(packet.text).toContain("Put the Command Waves manifest below in the PR body.");
    expect(packet.text).toContain("Do not merge PRs.");
    expect(packet.text).toContain("Do not deploy contracts.");
    expect(packet.text).toContain("Do not spend funds.");
    expect(packet.text).toContain("drop-cmd-001-approval");
    expect(packet.text).not.toContain("\u2014");
  });

  it("requires a configured GitHub repo for PR work packets", () => {
    expect(() =>
      createCodexWorkPacket({
        wave: demoWave,
        proposal: demoWave.proposals[0],
        poll: demoWave.polls[0],
      }),
    ).toThrow("Connect the real GitHub repo before creating a Codex work packet.");
  });

  it("requires a project decision receipt for PR work packets", () => {
    const proposal = {
      ...configuredDemoWave.proposals[0],
      status: "approved" as const,
    };
    const poll = {
      ...configuredDemoWave.polls[0],
      decision: null,
    };

    expect(() =>
      createCodexWorkPacket({
        wave: configuredDemoWave,
        proposal,
        poll,
      }),
    ).toThrow("Record the project decision receipt before creating a Codex work packet.");
  });

  it("only creates packets for PR commands", () => {
    expect(() =>
      createCodexWorkPacket({
        wave: demoWave,
        proposal: {
          ...demoWave.proposals[0],
          kind: "draft_response",
        },
        poll: null,
      }),
    ).toThrow("Codex work packets are only available for PR commands.");
  });

  it("requires a project decision URL for PR work packet receipts", () => {
    const proposal = {
      ...configuredDemoWave.proposals[0],
      status: "approved" as const,
    };
    const poll = {
      ...configuredDemoWave.polls[0],
      decision: {
        ...configuredDemoWave.polls[0].decision!,
        dropId: "drop-cmd-001-approval",
        url: null,
      },
    };

    expect(() =>
      createCodexWorkPacket({
        wave: configuredDemoWave,
        proposal,
        poll,
      }),
    ).toThrow("Record the project decision receipt before creating a Codex work packet.");
  });
});
