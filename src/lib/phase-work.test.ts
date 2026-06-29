import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { selectPhaseWork } from "./phase-work";

describe("phase work selector", () => {
  it("keeps the PR command as phase work when support commands are newer", () => {
    const supportProposal = {
      ...demoWave.proposals[0],
      id: "cmd-002",
      title: "Draft launch update",
      kind: "draft_response" as const,
      status: "approved" as const,
    };
    const phaseWork = selectPhaseWork({
      ...demoWave,
      proposals: [supportProposal, demoWave.proposals[0]],
    });

    expect(phaseWork.prProposal).toMatchObject({
      id: "cmd-001",
      kind: "open_pr",
    });
    expect(phaseWork.prPoll?.proposalId).toBe("cmd-001");
    expect(phaseWork.prExecution?.proposalId).toBe("cmd-001");
    expect(phaseWork.prReview?.proposalId).toBe("cmd-001");
    expect(phaseWork.supportProposals.map((proposal) => proposal.id)).toEqual(["cmd-002"]);
  });

  it("returns support commands when no PR command exists yet", () => {
    const supportProposal = {
      ...demoWave.proposals[0],
      id: "cmd-002",
      title: "Draft launch update",
      kind: "draft_response" as const,
      status: "approved" as const,
    };
    const phaseWork = selectPhaseWork({
      ...demoWave,
      proposals: [supportProposal],
      polls: [],
      executions: [],
      reviews: [],
    });

    expect(phaseWork.prProposal).toBeNull();
    expect(phaseWork.prPoll).toBeNull();
    expect(phaseWork.prExecution).toBeNull();
    expect(phaseWork.prReview).toBeNull();
    expect(phaseWork.supportProposals.map((proposal) => proposal.id)).toEqual(["cmd-002"]);
  });

  it("selects the next unfinished PR command after reviewed work", () => {
    const nextProposal = {
      ...demoWave.proposals[0],
      id: "cmd-002",
      title: "Add fee cap tests",
      status: "ready_for_vote" as const,
    };
    const phaseWork = selectPhaseWork({
      ...demoWave,
      proposals: [demoWave.proposals[0], nextProposal],
    });

    expect(phaseWork.prProposal).toMatchObject({
      id: "cmd-002",
      status: "ready_for_vote",
    });
    expect(phaseWork.prPoll).toBeNull();
    expect(phaseWork.prExecution).toBeNull();
    expect(phaseWork.prReview).toBeNull();
  });

  it("falls back to reviewed PR work when every PR command is complete", () => {
    const olderReviewedProposal = {
      ...demoWave.proposals[0],
      id: "cmd-000",
      title: "Older reviewed hook work",
      status: "complete" as const,
    };
    const phaseWork = selectPhaseWork({
      ...demoWave,
      proposals: [demoWave.proposals[0], olderReviewedProposal],
    });

    expect(phaseWork.prProposal).toMatchObject({
      id: "cmd-001",
      status: "complete",
    });
    expect(phaseWork.prPoll?.proposalId).toBe("cmd-001");
    expect(phaseWork.prExecution?.proposalId).toBe("cmd-001");
    expect(phaseWork.prReview?.proposalId).toBe("cmd-001");
  });
});
