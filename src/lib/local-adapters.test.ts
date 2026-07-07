import { describe, expect, it } from "vitest";
import { createAgentHandoffPacket, findAgentHandoffArtifact, formatAgentHandoffArtifact } from "./agent-handoff";
import { demoWave } from "./demo-wave";
import { findExecutionFileManifestArtifact } from "./execution-files";
import { createLocalOrchestratorAdapter, localGuardianAdapter, localOrchestratorAdapter, localRepoAdapter } from "./local-adapters";
import { COMMAND_PR_MANIFEST_START } from "./github/pr-reviewer-gate";
import { createCommandRunManifest, findRunManifestArtifact, formatRunManifestArtifact } from "./run-manifest";

describe("local command adapters", () => {
  const configuredWave = {
    ...demoWave,
    repoUrl: "https://github.com/6529-Collections/6529-hook",
  };

  it("includes run manifest evidence in local agent executions", async () => {
    const proposal = configuredWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: configuredWave,
      proposal,
      poll: configuredWave.polls[0],
    });

    expect(findRunManifestArtifact(execution.artifacts)).toMatchObject({
      proposalId: proposal.id,
      rulesVersion: configuredWave.rules.version,
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      maxCostUsd: proposal.budgetUsd,
    });
    expect(findAgentHandoffArtifact(execution.artifacts)).toMatchObject({
      proposalId: proposal.id,
      repoUrl: configuredWave.repoUrl,
      allowedPermissions: ["wave.read", "repo.read", "repo.open_pr"],
      maxCostUsd: proposal.budgetUsd,
    });
    expect(execution.artifacts).toContain("PR body includes Command Waves manifest");
    expect(execution.artifacts).toContain("Codex handoff packet recorded");
    expect(execution.artifacts).toContain("prepared branch command/cmd-001-draft-the-non-upgradeable-hook-scaffold");
    expect(execution.artifacts).toContain("packet path .command-waves/commands/cmd-001.md");
    expect(execution.artifacts).toContain("changed .command-waves/commands/cmd-001.md");
    expect(execution.artifacts.some((artifact) => artifact.startsWith("packet commit local-"))).toBe(true);
    expect(execution.summary).toBe("Agent adapter prepared a branch with the Codex work packet and opened a draft PR record.");
  });

  it("passes the command manifest into the PR body", async () => {
    let prBody = "";
    const orchestrator = createLocalOrchestratorAdapter({
      repoAdapter: {
        ...localRepoAdapter,
        async openPullRequest(input) {
          prBody = input.body;

          return {
            prNumber: 12,
            url: "https://github.com/6529-Collections/6529-hook/pull/12",
            headSha: "abc123",
          };
        },
      },
    });

    await orchestrator.execute({
      wave: configuredWave,
      proposal: configuredWave.proposals[0],
      poll: configuredWave.polls[0],
    });

    expect(prBody).toContain(COMMAND_PR_MANIFEST_START);
    expect(prBody).toContain(configuredWave.proposals[0].id);
  });

  it("prepares a branch and commits the work packet before opening the PR", async () => {
    const calls: string[] = [];
    const orchestrator = createLocalOrchestratorAdapter({
      repoAdapter: {
        async prepareBranch(input) {
          calls.push(`prepare:${input.branchName}:${input.baseBranch}`);

          return {
            branchName: input.branchName,
            baseBranch: input.baseBranch ?? "main",
            baseSha: "base-sha",
            ref: `refs/heads/${input.branchName}`,
            url: `https://github.com/6529-Collections/6529-hook/tree/${input.branchName}`,
          };
        },
        async commitFiles(input) {
          calls.push(`commit:${input.branchName}:${input.files[0]?.path}`);
          expect(input.files[0]?.content).toContain("Command Waves Codex work packet");

          return {
            branchName: input.branchName,
            commitSha: "commit-sha",
            url: `https://github.com/6529-Collections/6529-hook/commit/commit-sha`,
            changedPaths: input.files.map((file) => file.path),
          };
        },
        async openPullRequest(input) {
          calls.push(`pr:${input.branchName}:${input.draft}`);

          return {
            prNumber: 12,
            url: "https://github.com/6529-Collections/6529-hook/pull/12",
            headSha: "abc123",
          };
        },
      },
    });

    await orchestrator.execute({
      wave: configuredWave,
      proposal: configuredWave.proposals[0],
      poll: configuredWave.polls[0],
    });

    expect(calls).toEqual([
      "prepare:command/cmd-001-draft-the-non-upgradeable-hook-scaffold:main",
      "commit:command/cmd-001-draft-the-non-upgradeable-hook-scaffold:.command-waves/commands/cmd-001.md",
      "pr:command/cmd-001-draft-the-non-upgradeable-hook-scaffold:true",
    ]);
  });

  it("commits approved files with the work packet", async () => {
    const committedPaths: string[] = [];
    const orchestrator = createLocalOrchestratorAdapter({
      repoAdapter: {
        ...localRepoAdapter,
        async commitFiles(input) {
          committedPaths.push(...input.files.map((file) => file.path));

          return {
            branchName: input.branchName,
            commitSha: "commit-sha",
            url: "https://github.com/6529-Collections/6529-hook/commit/commit-sha",
            changedPaths: input.files.map((file) => file.path),
          };
        },
      },
    });

    const execution = await orchestrator.execute({
      wave: configuredWave,
      proposal: configuredWave.proposals[0],
      poll: configuredWave.polls[0],
      files: [
        {
          path: "test/FeeCap.t.sol",
          content: "contract FeeCapTest { function testFeeCap100Bps() public {} }",
        },
      ],
    });

    expect(committedPaths).toEqual([".command-waves/commands/cmd-001.md", "test/FeeCap.t.sol"]);
    expect(execution.artifacts).toContain("approved file test/FeeCap.t.sol");
    expect(execution.artifacts).toContain("changed .command-waves/commands/cmd-001.md, test/FeeCap.t.sol");

    const approvedFileManifest = findExecutionFileManifestArtifact(execution.artifacts);

    expect(approvedFileManifest).toMatchObject({
      proposalId: "cmd-001",
      fileCount: 1,
      totalContentLength: expect.any(Number),
      files: [
        {
          path: "test/FeeCap.t.sol",
          contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          contentLength: expect.any(Number),
        },
      ],
      manifestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("requires branch and commit support before opening PR work", async () => {
    const orchestrator = createLocalOrchestratorAdapter({
      async openPullRequest() {
        return {
          prNumber: 12,
          url: "https://github.com/6529-Collections/6529-hook/pull/12",
          headSha: "abc123",
        };
      },
    });

    await expect(
      orchestrator.execute({
        wave: configuredWave,
        proposal: configuredWave.proposals[0],
        poll: configuredWave.polls[0],
      }),
    ).rejects.toThrow("Repo adapter must support prepareBranch for PR work.");
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

  it("can create local commit records", async () => {
    const commit = await localRepoAdapter.commitFiles?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      branchName: "command/cmd-001-draft-hook",
      message: "Add fee cap tests",
      files: [
        {
          path: "test/FeeCap.t.sol",
          content: "contract FeeCapTest {}",
        },
      ],
    });

    expect(commit).toMatchObject({
      branchName: "command/cmd-001-draft-hook",
      url: expect.stringContaining("https://github.com/6529-Collections/6529-hook/commit/local-"),
      changedPaths: ["test/FeeCap.t.sol"],
    });
    expect(commit?.commitSha).toMatch(/^local-/);
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
        ...localRepoAdapter,
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
      wave: configuredWave,
      proposal: configuredWave.proposals[0],
      poll: configuredWave.polls[0],
    });
    const review = await localGuardianAdapter.review({
      wave: configuredWave,
      proposal: configuredWave.proposals[0],
      execution,
    });

    expect(prBaseBranch).toBe("develop");
    expect(findAgentHandoffArtifact(execution.artifacts)).toMatchObject({ baseBranch: "develop" });
    expect(review.status).toBe("pass");
  });

  it("lets the reviewer pass execution only when manifest evidence matches", async () => {
    const proposal = configuredWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: configuredWave,
      proposal,
      poll: configuredWave.polls[0],
    });
    const review = await localGuardianAdapter.review({ wave: configuredWave, proposal, execution });

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

  it("asks for changes when approved files have no manifest", async () => {
    const proposal = configuredWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: configuredWave,
      proposal,
      poll: configuredWave.polls[0],
      files: [
        {
          path: "test/FeeCap.t.sol",
          content: "contract FeeCapTest { function testFeeCap100Bps() public {} }",
        },
      ],
    });
    const review = await localGuardianAdapter.review({
      wave: configuredWave,
      proposal,
      execution: {
        ...execution,
        artifacts: execution.artifacts.filter((artifact) => !artifact.startsWith("approved-files:")),
      },
    });

    expect(review.status).toBe("changes_requested");
    expect(review.checks).toContain("Approved file manifest is missing or does not match approved file paths.");
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
      ...configuredWave,
      proposals: [proposal],
      polls: [poll],
      executions: [],
      reviews: [],
    };
    const runManifest = createCommandRunManifest({ wave, proposal });
    const handoff = createAgentHandoffPacket({ wave, proposal, poll, runManifest });
    const execution = {
      proposalId: proposal.id,
      harness: "codex" as const,
      status: "complete" as const,
      summary: "Manual reviewer evidence for a PR command without a project decision URL.",
      artifacts: [
        formatRunManifestArtifact(runManifest),
        formatAgentHandoffArtifact(handoff),
        "PR #12",
        "https://github.com/6529-Collections/6529-hook/pull/12",
      ],
    };
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
      ...configuredWave,
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
    const proposal = configuredWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: configuredWave,
      proposal,
      poll: configuredWave.polls[0],
    });
    const review = await localGuardianAdapter.review({
      wave: configuredWave,
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
    const proposal = configuredWave.proposals[0];
    const execution = await localOrchestratorAdapter.execute({
      wave: configuredWave,
      proposal,
      poll: configuredWave.polls[0],
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
      wave: configuredWave,
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
