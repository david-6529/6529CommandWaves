import { describe, expect, it } from "vitest";
import { createWaveDecisionReceipt } from "../command-waves";
import type { CommandWave } from "../command-waves";
import { demoWave } from "../demo-wave";
import {
  createCommandPrManifest,
  createGuardianPullRequestAttestation,
  createGuardianAttestation,
  extractCommandPrManifestFromPullRequestBody,
  formatCommandPrManifestForPullRequest,
  validateCommandPrManifest,
  verifyGuardianAttestation,
  verifyGuardianPullRequestProof,
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

  it("passes a vote-gated command with a manual 6529 decision receipt", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-manual-wave-decision",
      status: "approved" as const,
      prompt: "Use Codex to update documentation.",
      spec: "Docs only.",
      risk: "medium" as const,
    };
    const poll = {
      proposalId: proposal.id,
      yesVotes: 0,
      noVotes: 0,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "passed" as const,
      votes: [],
      decision: createWaveDecisionReceipt({
        proposalId: proposal.id,
        reference: "https://6529.io/waves/6529-hook-builder/drops/drop-manual-decision",
        waveUrl: wave.waveUrl,
        recordedBy: "david",
        recordedAt: "2026-06-20T18:00:00.000Z",
      }),
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["README.md"],
    });

    expect(manifest.pollDropId).toBe("drop-manual-decision");
    expect(result.status).toBe("pass");
    expect(result.checks.find((item) => item.id === "vote")?.status).toBe("pass");
  });

  it("fails local counted vote approval without a 6529 decision receipt", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-local-votes-only",
      status: "approved" as const,
      prompt: "Use Codex to update documentation.",
      spec: "Docs only.",
      risk: "medium" as const,
    };
    const poll = {
      proposalId: proposal.id,
      yesVotes: 3,
      noVotes: 0,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "passed" as const,
      votes: [],
      decision: null,
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["README.md"],
    });
    const voteCheck = result.checks.find((item) => item.id === "vote");

    expect(manifest.approval.status).toBe("pending");
    expect(result.status).toBe("fail");
    expect(voteCheck).toMatchObject({
      status: "fail",
      message: "Local vote passed. Record a 6529 decision receipt before PR review can pass.",
    });
  });

  it("fails a stored decision receipt URL from another wave", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-wrong-wave-receipt",
      status: "approved" as const,
      prompt: "Use Codex to update documentation.",
      spec: "Docs only.",
      risk: "medium" as const,
    };
    const poll = {
      proposalId: proposal.id,
      yesVotes: 3,
      noVotes: 0,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "passed" as const,
      votes: [],
      decision: createWaveDecisionReceipt({
        proposalId: proposal.id,
        reference: "https://6529.io/waves/other-builder-wave/drops/drop-wrong-wave",
        waveUrl: wave.waveUrl,
        recordedBy: "david",
        recordedAt: "2026-06-20T18:00:00.000Z",
      }),
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest: {
        ...manifest,
        approval: {
          ...manifest.approval,
          status: "passed",
        },
      },
      changedPaths: ["README.md"],
    });

    expect(manifest.approval.status).toBe("pending");
    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "vote")).toMatchObject({
      status: "fail",
      message: "6529 decision URL must match the configured discussion.",
    });
  });

  it("fails a PR receipt that has only a drop id", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-drop-id-only-receipt",
      status: "approved" as const,
      prompt: "Use Codex to update documentation.",
      spec: "Docs only.",
      risk: "medium" as const,
    };
    const poll = {
      proposalId: proposal.id,
      yesVotes: 3,
      noVotes: 0,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "passed" as const,
      votes: [],
      decision: {
        source: "manual" as const,
        dropId: "drop-manual-decision",
        url: null,
        recordedBy: "david",
        recordedAt: "2026-06-20T18:00:00.000Z",
        summary: "Builder wave approved the work.",
      },
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest: {
        ...manifest,
        approval: {
          ...manifest.approval,
          status: "passed",
        },
      },
      changedPaths: ["README.md"],
    });

    expect(manifest.approval.status).toBe("pending");
    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "vote")).toMatchObject({
      status: "fail",
      message: "6529 decision URL is required for PR work.",
    });
  });

  it("fails medium-risk commands that touch workflow enforcement", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-docs",
      title: "Update docs",
      risk: "medium" as const,
      prompt: "Update the README.",
      spec: "Documentation only.",
    };
    const poll = {
      ...wave.polls[0],
      proposalId: proposal.id,
    };
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

  it("passes bounded hook parameter changes when approved as high risk", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["contracts/HookParameters.sol"],
      changedFiles: [
        {
          path: "contracts/HookParameters.sol",
          patch: [
            "@@",
            "+uint16 public feeBps;",
            "+function setFeeBps(uint16 nextFeeBps) external {",
            "+  feeBps = nextFeeBps;",
            "+}",
          ].join("\n"),
        },
      ],
    });

    expect(result.status).toBe("pass");
    expect(result.hookSignals).toContainEqual(expect.objectContaining({ label: "parameter_change", risk: "high" }));
    expect(result.hookPatchSignals).toContainEqual(expect.objectContaining({ label: "parameter_write", risk: "high" }));
    expect(result.hookParameterChecks.every((item) => item.status === "pass")).toBe(true);
  });

  it("fails hook parameter changes that do not name a cap", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-vague-params",
      prompt: "Add tweakable fee parameters to the hook.",
      spec: "Include tests for parameter behavior.",
    };
    const poll = {
      ...wave.polls[0],
      proposalId: proposal.id,
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["contracts/HookParameters.sol"],
    });

    expect(result.status).toBe("fail");
    expect(result.hookParameterChecks.find((item) => item.id === "hook_parameter_explicit_bound")?.status).toBe(
      "fail",
    );
  });

  it("blocks upgradeable hook patterns without an explicit exception", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-upgradeable",
      risk: "critical" as const,
      prompt: "Add a UUPS proxy to the hook.",
      spec: "Use upgradeable storage and initializer wiring.",
    };
    const poll = {
      ...wave.polls[0],
      proposalId: proposal.id,
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["contracts/UUPSProxy.sol"],
    });

    expect(result.status).toBe("fail");
    expect(result.hookSignals).toContainEqual(
      expect.objectContaining({ label: "upgradeability", risk: "critical", defaultBlocked: true }),
    );
    expect(result.checks.find((item) => item.id.startsWith("hook_upgradeability"))?.status).toBe("fail");
  });

  it("blocks upgradeability added in Solidity patch content", () => {
    const wave = approvedDemoWave();
    const proposal = {
      ...wave.proposals[0],
      id: "cmd-patch-upgradeable",
      risk: "critical" as const,
      prompt: "Draft hook internals.",
      spec: "No proxy or upgradeability exception is approved.",
    };
    const poll = {
      ...wave.polls[0],
      proposalId: proposal.id,
    };
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["contracts/Hook.sol"],
      changedFiles: [
        {
          path: "contracts/Hook.sol",
          patch: [
            "@@",
            "+import {UUPSUpgradeable} from \"openzeppelin/proxy/utils/UUPSUpgradeable.sol\";",
            "+contract Hook is UUPSUpgradeable {",
            "+  function _authorizeUpgrade(address nextImplementation) internal override onlyOwner {}",
            "+}",
          ].join("\n"),
        },
      ],
    });

    expect(result.status).toBe("fail");
    expect(result.hookPatchSignals).toContainEqual(
      expect.objectContaining({ label: "upgradeability_pattern", risk: "critical", defaultBlocked: true }),
    );
    expect(result.checks.find((item) => item.id.startsWith("hook_patch_upgradeability_pattern"))?.status).toBe("fail");
  });

  it("requires critical approval for guardian proof code changes", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const manifest = createCommandPrManifest({ wave, proposal, poll });
    const result = validateCommandPrManifest({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: ["scripts/guardian-pr-check.ts"],
    });

    expect(result.status).toBe("fail");
    expect(result.diffSignals).toContainEqual(expect.objectContaining({ label: "guardian_proof", risk: "critical" }));
    expect(result.checks.find((item) => item.id === "diff_guardian_proof_scripts/guardian-pr-check.ts")?.status).toBe(
      "fail",
    );
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
    expect(attestation.inputs.changedFilesHash).toHaveLength(64);
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
    const changedFiles = [{ path: "src/app/page.tsx", patch: "@@\n+export default function Page() { return null; }" }];
    const attestation = createGuardianAttestation({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths,
      changedFiles,
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const again = createGuardianAttestation({
      wave,
      proposal,
      poll,
      manifest,
      changedPaths: [...changedPaths].reverse(),
      changedFiles: [...changedFiles],
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(attestation).toEqual(again);
    expect(attestation.verifier.mode).toBe("deterministic");
    expect(attestation.result.status).toBe("pass");
    expect(verifyGuardianAttestation({ wave, proposal, poll, manifest, changedPaths, changedFiles, attestation })).toBe(
      true,
    );
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

  it("verifies a pull request proof from attestation, wave state, and PR evidence", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const evidence = {
      pullRequestBody: formatCommandPrManifestForPullRequest(createCommandPrManifest({ wave, proposal, poll })),
      changedPaths: ["src/app/page.tsx", "README.md"],
      changedFiles: [{ path: "src/app/page.tsx", patch: "@@\n+export default function Page() { return null; }" }],
    };
    const attestation = createGuardianPullRequestAttestation({
      wave,
      evidence: {
        ...evidence,
        generatedAt: "2026-06-21T12:00:00.000Z",
      },
    });
    const result = verifyGuardianPullRequestProof({ wave, evidence, attestation });

    expect(result.status).toBe("pass");
    expect(result.expectedAttestationHash).toBe(attestation.attestationHash);
    expect(result.checks.every((item) => item.status === "pass")).toBe(true);
  });

  it("fails pull request proof verification when PR evidence changes", () => {
    const wave = approvedDemoWave();
    const proposal = wave.proposals[0];
    const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const evidence = {
      pullRequestBody: formatCommandPrManifestForPullRequest(createCommandPrManifest({ wave, proposal, poll })),
      changedPaths: ["README.md"],
      changedFiles: [{ path: "README.md", patch: "@@\n+first" }],
    };
    const attestation = createGuardianPullRequestAttestation({
      wave,
      evidence: {
        ...evidence,
        generatedAt: "2026-06-21T12:00:00.000Z",
      },
    });
    const result = verifyGuardianPullRequestProof({
      wave,
      evidence: {
        ...evidence,
        changedPaths: [".github/workflows/guardian-review.yml"],
        changedFiles: [{ path: "README.md", patch: "@@\n+second" }],
      },
      attestation,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "changed_paths_hash")?.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "changed_files_hash")?.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "attestation_hash")?.status).toBe("fail");
  });
});
