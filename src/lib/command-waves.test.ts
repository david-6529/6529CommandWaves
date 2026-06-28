import { describe, expect, it } from "vitest";
import { classifyRisk, defaultRules, evaluateGate, evaluatePoll, type CommandProposal, type PollState } from "./command-waves";

function proposal(kind: CommandProposal["kind"], prompt = "Do the work."): CommandProposal {
  return {
    id: "cmd-test",
    title: "Test command",
    proposer: "tester",
    kind,
    risk: classifyRisk(kind, prompt),
    prompt,
    spec: "Stay inside the approved scope.",
    budgetUsd: 1,
    status: "draft",
  };
}

describe("Command Waves rule engine", () => {
  it("classifies code work touching auth, wallets, or payments as high risk", () => {
    expect(classifyRisk("open_pr", "Add a wallet auth flow.")).toBe("high");
    expect(classifyRisk("run_script", "Migrate payment records.")).toBe("high");
  });

  it("classifies hook contract work as high risk", () => {
    expect(classifyRisk("open_pr", "Add a bounded fee parameter to the hook contract.")).toBe("high");
    expect(classifyRisk("open_pr", "Add a Solidity hook scaffold.")).toBe("high");
  });

  it("classifies deploys, spending, and rule changes as critical", () => {
    expect(classifyRisk("deploy", "Deploy current main.")).toBe("critical");
    expect(classifyRisk("spend_money", "Buy compute.")).toBe("critical");
    expect(classifyRisk("change_rules", "Lower quorum.")).toBe("critical");
  });

  it("requires polls for PR commands and allows read-only commands automatically", () => {
    expect(evaluateGate(proposal("open_pr"), defaultRules)).toMatchObject({
      needsPoll: true,
      canExecuteNow: false,
      blocked: false,
    });
    expect(evaluateGate(proposal("read_context"), defaultRules)).toMatchObject({
      needsPoll: false,
      canExecuteNow: true,
      blocked: false,
    });
  });

  it("passes a poll only when quorum and yes threshold are both met", () => {
    const underQuorum: PollState = {
      proposalId: "cmd-test",
      yesVotes: 2,
      noVotes: 0,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "open",
      votes: [],
    };
    const underThreshold: PollState = {
      ...underQuorum,
      yesVotes: 2,
      noVotes: 2,
    };
    const passed: PollState = {
      ...underQuorum,
      yesVotes: 3,
      noVotes: 1,
    };

    expect(evaluatePoll(underQuorum)).toMatchObject({ quorumMet: false, thresholdMet: true, passed: false });
    expect(evaluatePoll(underThreshold)).toMatchObject({ quorumMet: true, thresholdMet: false, passed: false });
    expect(evaluatePoll(passed)).toMatchObject({ quorumMet: true, thresholdMet: true, passed: true });
  });
});
