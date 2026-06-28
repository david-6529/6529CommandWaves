import { describe, expect, it } from "vitest";
import { findAgentHandoffArtifact } from "./agent-handoff";
import { demoWave } from "./demo-wave";
import { localGuardianAdapter } from "./local-adapters";
import { findRunManifestArtifact } from "./run-manifest";

describe("demo wave", () => {
  it("seeds the hook demo with deterministic run, handoff, and proof evidence", () => {
    const execution = demoWave.executions[0];
    const review = demoWave.reviews[0];

    expect(demoWave.proposals[0]).toMatchObject({
      id: "cmd-001",
      status: "complete",
      kind: "open_pr",
    });
    expect(findRunManifestArtifact(execution.artifacts)).toMatchObject({
      proposalId: "cmd-001",
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      maxCostUsd: 10,
    });
    expect(findAgentHandoffArtifact(execution.artifacts)).toMatchObject({
      proposalId: "cmd-001",
      repoUrl: demoWave.repoUrl,
      targetBranch: "command/cmd-001-draft-the-non-upgradeable-hook-scaffold",
    });
    expect(execution.artifacts).toContain("PR body includes Command Waves manifest");
    expect(review.proof).toMatchObject({
      version: "guardian-attestation-v0.1",
      verifier: "Command Waves Guardian",
      mode: "deterministic",
      inputs: {
        proposalId: "cmd-001",
      },
    });
    expect(review.proof?.attestationHash).toHaveLength(64);
  });

  it("passes the local reviewer against the seeded execution evidence", async () => {
    const proposal = demoWave.proposals[0];
    const execution = demoWave.executions[0];
    const review = await localGuardianAdapter.review({ wave: demoWave, proposal, execution });

    expect(review.status).toBe("pass");
    expect(review.checks).toContain(
      "Codex handoff packet matches the run manifest, target branch, permissions, and budget.",
    );
  });
});
