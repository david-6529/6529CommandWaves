import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createAgentHandoffPacket, findAgentHandoffArtifact, formatAgentHandoffArtifact } from "./agent-handoff";
import { createCommandPrManifest } from "./github/pr-reviewer-gate";
import { createCommandRunManifest, hashValue } from "./run-manifest";

describe("agent handoff packet", () => {
  it("creates deterministic Codex handoff evidence for an approved PR command", () => {
    const proposal = demoWave.proposals[0];
    const poll = demoWave.polls[0];
    const runManifest = createCommandRunManifest({ wave: demoWave, proposal });
    const packet = createAgentHandoffPacket({ wave: demoWave, proposal, poll, runManifest });
    const again = createAgentHandoffPacket({ wave: demoWave, proposal, poll, runManifest });

    expect(packet).toEqual(again);
    expect(packet).toMatchObject({
      version: "command-wave-agent-handoff-v0.1",
      harness: "codex",
      waveId: "6529-hook-builder",
      proposalId: proposal.id,
      repoUrl: demoWave.repoUrl,
      baseBranch: "main",
      targetBranch: runManifest.targetBranch,
      runManifestHash: runManifest.manifestHash,
      promptHash: runManifest.promptHash,
      specHash: runManifest.specHash,
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      maxRuntimeSeconds: runManifest.maxRuntimeSeconds,
      maxCostUsd: proposal.budgetUsd,
    });
    expect(packet.prManifestHash).toBe(hashValue(createCommandPrManifest({ wave: demoWave, proposal, poll })));
    expect(packet.requiredEvidence).toContain("Command Waves PR manifest in the PR body.");
    expect(packet.requiredEvidence).toContain(
      "Short note explaining explicit parameter caps, governance surfaces, and deployment files touched.",
    );
    expect(packet.constraints).toContain("Any fee, limit, or config parameter change must name an explicit cap.");
    expect(packet.forbiddenActions).toContain("Do not deploy contracts.");
    expect(packet.packetHash).toHaveLength(64);
  });

  it("round-trips through an execution artifact string", () => {
    const proposal = demoWave.proposals[0];
    const packet = createAgentHandoffPacket({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
    });

    expect(findAgentHandoffArtifact([formatAgentHandoffArtifact(packet)])).toEqual(packet);
    expect(findAgentHandoffArtifact(["not a packet"])).toBeNull();
    expect(findAgentHandoffArtifact(["agent-handoff:not json"])).toBeNull();
  });
});
