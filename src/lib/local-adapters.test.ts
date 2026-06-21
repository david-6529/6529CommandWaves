import { describe, expect, it } from "vitest";
import { demoWave } from "./command-waves";
import { localGuardianAdapter, localOrchestratorAdapter } from "./local-adapters";
import { findRunManifestArtifact } from "./run-manifest";

describe("local command adapters", () => {
  it("includes run manifest evidence in local AI worker executions", async () => {
    const proposal = demoWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
    });

    expect(findRunManifestArtifact(execution.artifacts)).toMatchObject({
      proposalId: proposal.id,
      rulesVersion: demoWave.rules.version,
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      maxCostUsd: proposal.budgetUsd,
    });
  });

  it("lets the reviewer pass execution only when manifest evidence matches", async () => {
    const proposal = demoWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
    });
    const review = await localGuardianAdapter.review({ wave: demoWave, proposal, execution });

    expect(review.status).toBe("pass");
    expect(review.checks).toContain("Run manifest matches approved command, rules hash, permissions, and budget.");
    expect(review.proof).toMatchObject({
      version: "guardian-attestation-v0.1",
      verifier: "Command Waves Guardian",
      mode: "deterministic",
      inputs: {
        proposalId: proposal.id,
      },
    });
    expect(review.proof?.attestationHash).toHaveLength(64);
  });

  it("asks for changes when execution evidence has no run manifest", async () => {
    const proposal = demoWave.proposals[0];
    const review = await localGuardianAdapter.review({
      wave: demoWave,
      proposal,
      execution: {
        proposalId: proposal.id,
        harness: "codex",
        status: "complete",
        summary: "No manifest.",
        artifacts: ["PR #1"],
      },
    });

    expect(review.status).toBe("changes_requested");
    expect(review.checks).toContain("Run manifest is missing or does not match the approved command.");
  });

  it("does not attach PR gate proof to non-PR command reviews", async () => {
    const proposal = {
      ...demoWave.proposals[0],
      kind: "draft_response" as const,
      status: "approved" as const,
    };
    const execution = await localOrchestratorAdapter.execute({
      wave: demoWave,
      proposal,
      poll: null,
    });
    const review = await localGuardianAdapter.review({ wave: demoWave, proposal, execution });

    expect(review.status).toBe("pass");
    expect(review.proof).toBeUndefined();
  });
});
