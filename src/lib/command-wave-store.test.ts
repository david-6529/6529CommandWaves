import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCommandWaveStoreForTests,
  executeProposal,
  getCommandWave,
  recordVote,
  replaceCommandWave,
  resetCommandWave,
  reviewProposal,
  submitCommandProposal,
  updateCommandWaveSetup,
} from "./command-wave-store";

describe("Command wave store", () => {
  const previousStoreMode = process.env.COMMAND_WAVE_STORE;

  beforeEach(async () => {
    process.env.COMMAND_WAVE_STORE = "memory";
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
  });

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

  it("rejects invalid setup before saving", async () => {
    await expect(updateCommandWaveSetup({
      waveUrl: "",
      repoUrl: "not github",
    })).rejects.toThrow("Fix the 6529 wave and GitHub repo before saving setup.");
  });

  it("submits poll-gated proposals and approves them after quorum passes", async () => {
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
    const approved = await recordVote({ proposalId: "cmd-002", voterIdentity: "carol", vote: "yes" });

    expect(approved.proposals[0].status).toBe("approved");
    expect(approved.polls[0]).toMatchObject({
      yesVotes: 3,
      status: "passed",
    });
    expect(approved.polls[0].votes.map((vote) => vote.voterIdentity)).toEqual(["carol", "bob", "alice"]);
  });

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

  it("rejects blocked command kinds without opening a poll", async () => {
    const wave = await getCommandWave();

    await replaceCommandWave({
      ...wave,
      rules: {
        ...wave.rules,
        rulesByKind: {
          ...wave.rules.rulesByKind,
          run_script: {
            ...wave.rules.rulesByKind.run_script,
            mode: "blocked",
            reason: "Scripts are disabled for this wave.",
          },
        },
      },
    });

    const submitted = await submitCommandProposal({
      title: "Run cleanup script",
      proposer: "tester",
      kind: "run_script",
      prompt: "Run a cleanup script.",
      spec: "Use the approved script only.",
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

  it("executes approved proposals and lets the reviewer complete them", async () => {
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

  it("rejects reviews unless the proposal is waiting for review", async () => {
    await expect(reviewProposal({ proposalId: "cmd-001" })).rejects.toThrow("Proposal is not ready for review.");

    await executeProposal({ proposalId: "cmd-001" });
    await reviewProposal({ proposalId: "cmd-001" });

    await expect(reviewProposal({ proposalId: "cmd-001" })).rejects.toThrow("Proposal is not ready for review.");
  });
});
