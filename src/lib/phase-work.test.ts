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
});
