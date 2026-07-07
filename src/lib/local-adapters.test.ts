import { describe, expect, it } from "vitest";
import { findAgentHandoffArtifact, formatAgentHandoffArtifact } from "./agent-handoff";
import { demoWave } from "./demo-wave";
import { createLocalOrchestratorAdapter, localGuardianAdapter, localOrchestratorAdapter, localRepoAdapter } from "./local-adapters";
import { COMMAND_PR_MANIFEST_START } from "./github/pr-reviewer-gate";
import { findRunManifestArtifact } from "./run-manifest";

describe("local command adapters", () => {
  const configuredWave = {
    ...demoWave,
    repoUrl: "https://github.com/6529-Collections/6529-hook",
  };

  it("includes run manifest evidence in local agent executions", async () => {
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
    expect(findAgentHandoffArtifact(execution.artifacts)).toMatchObject({
      proposalId: proposal.id,
      repoUrl: demoWave.repoUrl,
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      maxCostUsd: proposal.budgetUsd,
    });
    expect(execution.artifacts).toContain("PR body includes Command Waves manifest");
    expect(execution.artifacts).toContain("Codex handoff packet recorded");
  });

  it("passes the command manifest into the PR body", async () => {
    let prBody = "";
    const orchestrator = createLocalOrchestratorAdapter({
      async openPullRequest(input) {
        prBody = input.body;

        return {
          prNumber: 12,
          url: "https://github.com/6529-Collections/6529-hook/pull/12",
          headSha: "abc123",
        };
      },
    });

    await orchestrator.execute({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: demoWave.polls[0],
    });

    expect(prBody).toContain(COMMAND_PR_MANIFEST_START);
    expect(prBody).toContain(demoWave.proposals[0].id);
  });

  it("can create local pull request comment records", async () => {
    const localComment = await localRepoAdapter.commentOnPullRequest?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      prNumber: 12,
      body: "Review note.",
    });

    expect(localComment).toMatchObject({
      id: expect.stringMatching(/^local-comment-/),
      url: expect.stringContaining("https://github.com/6529-Collections/6529-hook/pull/12#issuecomment-"),
    });
  });

  it("can create local branch records", async () => {
    const branch = await localRepoAdapter.prepareBranch?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      baseBranch: "main",
      branchName: "command/cmd-001-draft-hook",
    });

    expect(branch).toMatchObject({
      branchName: "command/cmd-001-draft-hook",
      baseBranch: "main",
      ref: "refs/heads/command/cmd-001-draft-hook",
      url: "https://github.com/6529-Collections/6529-hook/tree/command/cmd-001-draft-hook",
    });
    expect(branch?.baseSha).toMatch(/^local-/);
  });

  it("can create local check run records", async () => {
    const checkRun = await localRepoAdapter.createCheckRun?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      name: "Command Waves Guardian",
      headSha: "0123456789abcdef0123456789abcdef01234567",
      status: "completed",
      conclusion: "success",
      summary: "Guardian review passed.",
    });

    expect(checkRun).toMatchObject({
      id: expect.stringMatching(/^local-check-/),
      url: expect.stringContaining("https://github.com/6529-Collections/6529-hook/checks/"),
      status: "completed",
      conclusion: "success",
    });
  });

  it("passes the configured base branch into the PR adapter and handoff packet", async () => {
    let prBaseBranch = "";
    const orchestrator = createLocalOrchestratorAdapter({
      baseBranch: "develop",
      repoAdapter: {
        async openPullRequest(input) {
          prBaseBranch = input.baseBranch ?? "";

          return {
            prNumber: 12,
            url: "https://github.com/6529-Collections/6529-hook/pull/12",
            headSha: "abc123",
          };
        },
      },
    });

    const execution = await orchestrator.execute({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: demoWave.polls[0],
    });
    const review = await localGuardianAdapter.review({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      execution,
    });

    expect(prBaseBranch).toBe("develop");
    expect(findAgentHandoffArtifact(execution.artifacts)).toMatchObject({ baseBranch: "develop" });
    expect(review.status).toBe("pass");
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
    expect(review.checks).toContain(
      "Codex handoff packet matches the run manifest, target branch, permissions, and budget.",
    );
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

  it("binds local reviewer proof to the selected GitHub repo", async () => {
    const proposal = configuredWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: configuredWave,
      proposal,
      poll: configuredWave.polls[0],
    });
    const review = await localGuardianAdapter.review({ wave: configuredWave, proposal, execution });

    expect(review.status).toBe("pass");
    expect(review.proof?.inputs.repositoryHash).toHaveLength(64);
    expect(review.checks).toContain("Guardian PR gate passed.");
  });

  it("asks for changes when the guardian PR gate fails", async () => {
    const proposal = {
      ...demoWave.proposals[0],
      id: "cmd-drop-id-only-receipt",
      status: "approved" as const,
      prompt: "Use Codex to update documentation.",
      spec: "Docs only.",
      risk: "medium" as const,
    };
    const poll = {
      ...demoWave.polls[0],
      proposalId: proposal.id,
      decision: {
        ...demoWave.polls[0].decision!,
        dropId: "drop-manual-decision",
        url: null,
      },
    };
    const wave = {
      ...demoWave,
      proposals: [proposal],
      polls: [poll],
      executions: [],
      reviews: [],
    };
    const execution = await localOrchestratorAdapter.execute({
      wave,
      proposal,
      poll,
    });
    const review = await localGuardianAdapter.review({ wave, proposal, execution });

    expect(review.status).toBe("changes_requested");
    expect(review.checks).toContain("Guardian PR gate failed: vote.");
  });

  it("asks for changes when hook parameter work has no explicit cap", async () => {
    const proposal = {
      ...demoWave.proposals[0],
      id: "cmd-vague-params",
      prompt: "Use Codex to add tweakable hook fee parameters.",
      spec: "Include tests for parameter behavior.",
    };
    const wave = {
      ...demoWave,
      proposals: [proposal],
      polls: [{ ...demoWave.polls[0], proposalId: proposal.id }],
    };
    const execution = await localOrchestratorAdapter.execute({
      wave,
      proposal,
      poll: wave.polls[0],
    });
    const review = await localGuardianAdapter.review({ wave, proposal, execution });

    expect(review.status).toBe("changes_requested");
    expect(review.checks).toContain(
      "Hook parameter work must name an explicit numeric cap or upper bound in the approved command.",
    );
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
    expect(review.checks).toContain("Codex handoff packet is missing for this PR command.");
  });

  it("asks for changes when a PR command has no Codex handoff packet", async () => {
    const proposal = demoWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
    });
    const review = await localGuardianAdapter.review({
      wave: demoWave,
      proposal,
      execution: {
        ...execution,
        artifacts: execution.artifacts.filter(
          (artifact) => !artifact.startsWith("agent-handoff:") && artifact !== "Codex handoff packet recorded",
        ),
      },
    });

    expect(review.status).toBe("changes_requested");
    expect(review.checks).toContain("Codex handoff packet is missing for this PR command.");
  });

  it("asks for changes when a PR command handoff packet is changed", async () => {
    const proposal = demoWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
    });
    const handoff = findAgentHandoffArtifact(execution.artifacts);

    if (!handoff) {
      throw new Error("Expected handoff packet.");
    }

    const changedHandoff = {
      ...handoff,
      repoUrl: "https://github.com/6529-Collections/other-hook",
    };
    const review = await localGuardianAdapter.review({
      wave: demoWave,
      proposal,
      execution: {
        ...execution,
        artifacts: execution.artifacts.map((artifact) =>
          artifact.startsWith("agent-handoff:") ? formatAgentHandoffArtifact(changedHandoff) : artifact,
        ),
      },
    });

    expect(review.status).toBe("changes_requested");
    expect(review.checks).toContain("Codex handoff packet does not match the approved run manifest.");
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
