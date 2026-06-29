import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCommandWaveStoreForTests,
  executeProposal,
  getCommandWave,
  recordDecisionReceipt,
  recordVote,
  replaceCommandWave,
  resetCommandWave,
  reviewProposal,
  submitCommandProposal,
  updateCommandWaveSetup,
} from "./command-wave-store";
import type { CommandKind } from "./command-waves";

describe("Command wave store", () => {
  const previousStoreMode = process.env.COMMAND_WAVE_STORE;
  const previousRepoAdapter = process.env.COMMAND_WAVE_REPO_ADAPTER;

  beforeEach(async () => {
    process.env.COMMAND_WAVE_STORE = "memory";
    process.env.COMMAND_WAVE_REPO_ADAPTER = "local";
    clearCommandWaveStoreForTests();
    await resetCommandWave();
  });

  afterEach(() => {
    clearCommandWaveStoreForTests();

    if (previousStoreMode === undefined) {
      delete process.env.COMMAND_WAVE_STORE;
    } else {
      process.env.COMMAND_WAVE_STORE = previousStoreMode;
    }

    if (previousRepoAdapter === undefined) {
      delete process.env.COMMAND_WAVE_REPO_ADAPTER;
    } else {
      process.env.COMMAND_WAVE_REPO_ADAPTER = previousRepoAdapter;
    }
  });

  async function makeSeedProposalReadyToBuild() {
    const wave = await getCommandWave();

    await replaceCommandWave({
      ...wave,
      proposals: wave.proposals.map((proposal) =>
        proposal.id === "cmd-001" ? { ...proposal, status: "approved" as const } : proposal,
      ),
      executions: [],
      reviews: [],
    });
  }

  it("logs setup updates with user-facing setup language", async () => {
    const wave = await updateCommandWaveSetup({
      waveUrl: "https://6529.io/waves/new-command-wave",
      repoUrl: "https://github.com/6529-Collections/new-command-wave",
    });

    expect(wave.waveUrl).toBe("https://6529.io/waves/new-command-wave");
    expect(wave.repoUrl).toBe("https://github.com/6529-Collections/new-command-wave");
    expect(wave.ledger[0]).toMatchObject({
      actor: "Setup",
      type: "rules_defined",
    });
  });

  it("saves participation notes without claiming live gate authority", async () => {
    const wave = await updateCommandWaveSetup({
      waveUrl: "https://6529.io/waves/new-command-wave",
      repoUrl: "https://github.com/6529-Collections/new-command-wave",
      gates: ["AMM QnA pass required", "REP or TDH planned, not enforced here"],
    });

    expect(wave.gates).toEqual([
      "AMM QnA pass required (manual note only, not enforced by this app)",
      "REP or TDH planned, not enforced here",
    ]);
  });

  it("rejects invalid setup before saving", async () => {
    await expect(updateCommandWaveSetup({
      waveUrl: "",
      repoUrl: "not github",
    })).rejects.toThrow("Fix the 6529 wave and GitHub repo before saving setup.");
  });

  it("keeps PR work waiting for a wave receipt after local quorum passes", async () => {
    const submitted = await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    expect(submitted.proposals[0]).toMatchObject({
      id: "cmd-002",
      risk: "medium",
      status: "ready_for_vote",
    });
    expect(submitted.polls[0]).toMatchObject({
      proposalId: "cmd-002",
      status: "open",
    });

    await recordVote({ proposalId: "cmd-002", voterIdentity: "alice", vote: "yes" });
    await recordVote({ proposalId: "cmd-002", voterIdentity: "bob", vote: "yes" });
    const voted = await recordVote({ proposalId: "cmd-002", voterIdentity: "carol", vote: "yes" });

    expect(voted.proposals[0].status).toBe("ready_for_vote");
    expect(voted.polls[0]).toMatchObject({
      yesVotes: 3,
      status: "passed",
    });
    expect(voted.polls[0].votes.map((vote) => vote.voterIdentity)).toEqual(["carol", "bob", "alice"]);
    expect(voted.ledger[0].message).toBe(
      "cmd-002 local vote passed. Record the builder wave decision receipt before work can run.",
    );
  });

  it("rejects PR proposals that fail hook preflight", async () => {
    await expect(
      submitCommandProposal({
        title: "Deploy upgradeable hook",
        proposer: "tester",
        kind: "open_pr",
        prompt: "Deploy an upgradeable UUPS hook and transfer ownership to a Safe.",
        spec: "Add governance threshold controls for future parameter changes.",
        budgetUsd: 1,
      }),
    ).rejects.toThrow("Fix hook proposal preflight before submitting PR work");
  });

  it("allows non-PR commands to discuss parked hook work", async () => {
    const submitted = await submitCommandProposal({
      title: "Draft launch scope note",
      proposer: "tester",
      kind: "draft_response",
      prompt: "Draft a note explaining that deployment and governance work are parked for phase 1.",
      spec: "Draft text only. Do not post it.",
      budgetUsd: 0,
    });

    expect(submitted.proposals[0]).toMatchObject({
      id: "cmd-002",
      kind: "draft_response",
      status: "approved",
    });
  });

  it.each(["run_script", "deploy", "spend_money", "change_rules"] satisfies CommandKind[])(
    "rejects %s proposals outside the first phase command surface",
    async (kind) => {
      await expect(
        submitCommandProposal({
          title: `Submit ${kind}`,
          proposer: "tester",
          kind,
          prompt: "Request work outside the first public hook phase.",
          spec: "Not available in phase 1.",
          budgetUsd: 1,
        }),
      ).rejects.toThrow("This phase accepts only context reads, drafts, wave updates, and PR commands.");
    },
  );

  it("requires voter identity and rejects duplicate votes", async () => {
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    await expect(recordVote({ proposalId: "cmd-002", vote: "yes" })).rejects.toThrow("Voter identity is required.");

    await recordVote({ proposalId: "cmd-002", voterIdentity: "alice", vote: "yes" });

    await expect(recordVote({ proposalId: "cmd-002", voterIdentity: "alice", vote: "no" })).rejects.toThrow(
      "Voter has already voted on this proposal.",
    );
  });

  it("records a manual wave decision receipt as approval evidence", async () => {
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    const approved = await recordDecisionReceipt({
      proposalId: "cmd-002",
      reference: "https://6529.io/waves/6529-hook-builder/drops/drop-approval-002",
      recordedBy: "david",
    });

    expect(approved.proposals[0]).toMatchObject({
      id: "cmd-002",
      status: "approved",
    });
    expect(approved.polls[0]).toMatchObject({
      proposalId: "cmd-002",
      status: "passed",
      yesVotes: 0,
      noVotes: 0,
      decision: {
        source: "6529",
        dropId: "drop-approval-002",
        recordedBy: "david",
      },
    });
    expect(approved.ledger[0].message).toBe("Recorded wave decision receipt for cmd-002.");
  });

  it("rejects decision receipt URLs from another wave", async () => {
    await updateCommandWaveSetup({
      waveUrl: "https://6529.io/waves/new-command-wave",
      repoUrl: "https://github.com/6529-Collections/new-command-wave",
    });
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    await expect(
      recordDecisionReceipt({
        proposalId: "cmd-002",
        reference: "https://6529.io/waves/other-command-wave/drops/drop-approval-002",
        recordedBy: "david",
      }),
    ).rejects.toThrow("Wave decision URL must match the configured builder wave.");
  });

  it("rejects malformed decision receipt URLs", async () => {
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    await expect(
      recordDecisionReceipt({
        proposalId: "cmd-002",
        reference: "https://[invalid",
        recordedBy: "david",
      }),
    ).rejects.toThrow("Wave decision URL is not valid.");
  });

  it("requires a decision URL for PR command receipts", async () => {
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    await expect(
      recordDecisionReceipt({
        proposalId: "cmd-002",
        reference: "drop-approval-002",
        recordedBy: "david",
      }),
    ).rejects.toThrow("Wave decision URL is required for PR work.");
  });

  it("allows drop id receipts for support decisions", async () => {
    const submitted = await submitCommandProposal({
      title: "Post launch update",
      proposer: "tester",
      kind: "post_to_wave",
      prompt: "Post a launch update.",
      spec: "Use approved text only.",
      budgetUsd: 0,
    });

    const approved = await recordDecisionReceipt({
      proposalId: submitted.proposals[0].id,
      reference: "drop-support-approval",
      recordedBy: "david",
    });

    expect(approved.polls[0]).toMatchObject({
      proposalId: submitted.proposals[0].id,
      status: "passed",
      decision: {
        dropId: "drop-support-approval",
        url: null,
      },
    });
  });

  it("rejects blocked command kinds without opening a poll", async () => {
    const wave = await getCommandWave();

    await replaceCommandWave({
      ...wave,
      rules: {
        ...wave.rules,
        rulesByKind: {
          ...wave.rules.rulesByKind,
          post_to_wave: {
            ...wave.rules.rulesByKind.post_to_wave,
            mode: "blocked",
            reason: "Wave posts are disabled for this wave.",
          },
        },
      },
    });

    const submitted = await submitCommandProposal({
      title: "Post launch update",
      proposer: "tester",
      kind: "post_to_wave",
      prompt: "Post a launch update.",
      spec: "Use approved text only.",
      budgetUsd: 1,
    });

    expect(submitted.proposals[0]).toMatchObject({
      id: "cmd-002",
      status: "rejected",
    });
    expect(submitted.polls.some((poll) => poll.proposalId === "cmd-002")).toBe(false);
    expect(submitted.ledger[0].message).toContain("blocked by current rules");
  });

  it("rejects votes after a poll is closed", async () => {
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    await recordVote({ proposalId: "cmd-002", voterIdentity: "alice", vote: "yes" });
    await recordVote({ proposalId: "cmd-002", voterIdentity: "bob", vote: "yes" });
    await recordVote({ proposalId: "cmd-002", voterIdentity: "carol", vote: "yes" });

    await expect(recordVote({ proposalId: "cmd-002", voterIdentity: "dave", vote: "yes" })).rejects.toThrow("Poll is not open.");
  });

  it("requires a builder wave decision receipt before PR execution", async () => {
    await submitCommandProposal({
      title: "Open a PR",
      proposer: "tester",
      kind: "open_pr",
      prompt: "Use Codex to add docs.",
      spec: "Docs only.",
      budgetUsd: 1,
    });

    await recordVote({ proposalId: "cmd-002", voterIdentity: "alice", vote: "yes" });
    await recordVote({ proposalId: "cmd-002", voterIdentity: "bob", vote: "yes" });
    await recordVote({ proposalId: "cmd-002", voterIdentity: "carol", vote: "yes" });

    await expect(executeProposal({ proposalId: "cmd-002" })).rejects.toThrow(
      "Record the builder wave decision receipt before running a PR command.",
    );

    await recordDecisionReceipt({
      proposalId: "cmd-002",
      reference: "https://6529.io/waves/6529-hook-builder/drops/drop-approval-002",
      recordedBy: "david",
    });

    const executed = await executeProposal({ proposalId: "cmd-002" });

    expect(executed.proposals.find((proposal) => proposal.id === "cmd-002")).toMatchObject({
      status: "reviewing",
    });
  });

  it("executes approved proposals and lets the reviewer complete them", async () => {
    await makeSeedProposalReadyToBuild();

    const executed = await executeProposal({ proposalId: "cmd-001" });

    expect(executed.proposals[0].status).toBe("reviewing");
    expect(executed.executions[0]).toMatchObject({
      proposalId: "cmd-001",
      harness: "codex",
      status: "complete",
    });

    const reviewed = await reviewProposal({ proposalId: "cmd-001" });

    expect(reviewed.proposals[0].status).toBe("complete");
    expect(reviewed.reviews[0]).toMatchObject({
      proposalId: "cmd-001",
      status: "pass",
    });
  });

  it("does not execute non-PR support commands in the phase 1 build step", async () => {
    const submitted = await submitCommandProposal({
      title: "Draft launch scope note",
      proposer: "tester",
      kind: "draft_response",
      prompt: "Draft a note explaining phase 1 launch scope.",
      spec: "Draft text only.",
      budgetUsd: 0,
    });

    expect(submitted.proposals[0]).toMatchObject({
      id: "cmd-002",
      status: "approved",
    });
    await expect(executeProposal({ proposalId: "cmd-002" })).rejects.toThrow(
      "Only approved PR commands can use the agent build step in phase 1.",
    );
  });

  it("rejects reviews unless the proposal is waiting for review", async () => {
    await expect(reviewProposal({ proposalId: "cmd-001" })).rejects.toThrow("Proposal is not ready for review.");

    await makeSeedProposalReadyToBuild();
    await executeProposal({ proposalId: "cmd-001" });
    await reviewProposal({ proposalId: "cmd-001" });

    await expect(reviewProposal({ proposalId: "cmd-001" })).rejects.toThrow("Proposal is not ready for review.");
  });
});
