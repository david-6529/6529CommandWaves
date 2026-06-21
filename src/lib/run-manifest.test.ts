import { describe, expect, it } from "vitest";
import { demoWave } from "./command-waves";
import { createCommandRunManifest, findRunManifestArtifact, formatRunManifestArtifact } from "./run-manifest";

describe("command run manifest", () => {
  it("creates deterministic execution evidence for an approved command", () => {
    const proposal = demoWave.proposals[0];
    const manifest = createCommandRunManifest({ wave: demoWave, proposal });
    const again = createCommandRunManifest({ wave: demoWave, proposal });

    expect(manifest).toEqual(again);
    expect(manifest).toMatchObject({
      proposalId: proposal.id,
      commandKind: "open_pr",
      rulesVersion: demoWave.rules.version,
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      budgetUsd: proposal.budgetUsd,
      maxCostUsd: proposal.budgetUsd,
    });
    expect(manifest.rulesHash).toHaveLength(64);
    expect(manifest.manifestHash).toHaveLength(64);
    expect(manifest.targetBranch).toContain(proposal.id);
  });

  it("round-trips through an execution artifact string", () => {
    const manifest = createCommandRunManifest({ wave: demoWave, proposal: demoWave.proposals[0] });

    expect(findRunManifestArtifact([formatRunManifestArtifact(manifest)])).toEqual(manifest);
    expect(findRunManifestArtifact(["not a manifest"])).toBeNull();
  });
});
