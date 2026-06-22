import { describe, expect, it } from "vitest";
import { demoWave, type CommandWave } from "../command-waves";
import {
  createCommandPrManifest,
  createGuardianPullRequestAttestation,
  createGuardianAttestation,
  extractCommandPrManifestFromPullRequestBody,
  formatCommandPrManifestForPullRequest,
  validateCommandPrManifest,
  verifyGuardianAttestation,
} from "./pr-reviewer-gate";

function approvedDemoWave(): CommandWave {
  return JSON.parse(JSON.stringify(demoWave)) as CommandWave;
}

describe("PR reviewer gate", () => {
  it("passes an approved open_pr manifest with normal app changes", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["src/app/page.tsx", "README.md"],
    });

    expect(result.status).toBe("pass");
    expect(result.checks.every((item) => item.status === "pass")).toBe(true);
  });

  it("fails when a vote-gated command has not passed", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-unapproved",
      status: "ready_for_vote" as const,
    };
    const poll = {
      proposalId: proposal.id,
      yesVotes: 1,
      noVotes: 1,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "open" as const,
      votes: [],
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["src/app/page.tsx"],
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "proposal_status")?.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "vote")?.status).toBe("fail");
  });

  it("fails medium-risk commands that touch workflow enforcement", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: [".github/workflows/deploy.yml"],
    });

    expect(result.status).toBe("fail");
    expect(result.diffSignals).toContainEqual(expect.objectContaining({ label: "workflow", risk: "high" }));
  });

  it("fails tampered prompt/spec hashes", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = {
      ...createCommandPrManifest({ wave, proposal, poll }),
      promptHash: "tampered",
    };
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["src/app/page.tsx"],
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "prompt_spec_hashes")?.status).toBe("fail");
  });

  it("round-trips a command manifest through a PR body", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const body = [
      "This PR was opened by Command Waves.",
      "",
      formatCommandPrManifestForPullRequest(manifest),
    ].join("\n");

    expect(extractCommandPrManifestFromPullRequestBody(body)).toEqual(manifest);
    expect(extractCommandPrManifestFromPullRequestBody("no manifest")).toBeNull();
  });

  it("creates a guardian attestation from PR evidence", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const attestation = createGuardianPullRequestAttestation({
      wave,
      evidence: {
        pullRequestBody: formatCommandPrManifestForPullRequest(manifest),
        changedPaths: ["src/app/page.tsx", "README.md"],
        generatedAt: "2026-06-21T12:00:00.000Z",
      },
    });

    expect(attestation.result.status).toBe("pass");
    expect(attestation.inputs.proposalId).toBe(proposal.id);
    expect(attestation.inputs.waveStateHash).toHaveLength(64);
    expect(attestation.inputs.proposalHash).toHaveLength(64);
    expect(attestation.inputs.pollHash).toHaveLength(64);
    expect(attestation.inputs.manifestHash).toHaveLength(64);
  });

  it("fails PR evidence when the manifest is missing", () => {
    const wave = approvedDemoWave();
    const attestation = createGuardianPullRequestAttestation({
      wave,
      evidence: {
        pullRequestBody: "No Command Waves manifest here.",
        changedPaths: ["src/app/page.tsx"],
        generatedAt: "2026-06-21T12:00:00.000Z",
      },
    });

    expect(attestation.result.status).toBe("fail");
    expect(attestation.result.checks[0]).toMatchObject({
      id: "proposal_exists",
      status: "fail",
    });
  });

  it("creates a deterministic guardian attestation that can be rerun", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const changedPaths = ["README.md", "src/app/page.tsx"];
    const attestation = createGuardianAttestation({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const again = createGuardianAttestation({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: [...changedPaths].reverse(),
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(attestation).toEqual(again);
    expect(attestation.verifier.mode).toBe("deterministic");
    expect(attestation.result.status).toBe("pass");
    expect(verifyGuardianAttestation({ wave, proposal, poll, manifest, changedPaths, attestation })).toBe(true);
    expect(attestation.attestationHash).toHaveLength(64);
  });

  it("fails attestation replay when the wave state changes", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const attestation = createGuardianAttestation({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["README.md"],
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const changedWave = {
      ...wave,
      name: "Tampered Wave Name",
    };

    expect(
      verifyGuardianAttestation({
        wave: changedWave,
        proposal,
        poll,
        manifest,
        changedPaths: ["README.md"],
        attestation,
      }),
    ).toBe(false);
  });
});
