import { describe, expect, it } from "vitest";
import { classifyRisk, type CommandProposal } from "../command-waves";
import { findDangerousPromptFlags, proposalTouchesDangerousSurface, toolPolicyForKind } from "./tool-policy";

function proposal(prompt: string): CommandProposal {
  return {
    id: "cmd-test",
    title: "Test",
    proposer: "tester",
    kind: "open_pr",
    risk: classifyRisk("open_pr", prompt),
    prompt,
    spec: "Stay in scope.",
    budgetUsd: 1,
    status: "approved",
  };
}

describe("tool policy", () => {
  it("maps command kinds to explicit tool permissions", () => {
    expect(toolPolicyForKind("read_context").permissions).toEqual(["wave.read", "repo.read"]);
    expect(toolPolicyForKind("post_to_wave")).toMatchObject({
      permissions: ["wave.read", "wave.draft"],
      requiresGuardian: false,
      reason: "Wave updates are drafted for human posting.",
    });
    expect(toolPolicyForKind("post_to_wave").permissions).not.toContain("wave.post");
    expect(toolPolicyForKind("open_pr").permissions).toEqual(["wave.read", "repo.read", "repo.open_pr"]);
    expect(toolPolicyForKind("deploy").permissions).toEqual(["wave.read", "repo.read", "deploy.run"]);
  });

  it("detects dangerous prompt surfaces", () => {
    expect(findDangerousPromptFlags("deploy this and use the wallet private key")).toEqual(["wallet", "deploy"]);
    expect(proposalTouchesDangerousSurface(proposal("Add copy only."))).toBe(false);
    expect(proposalTouchesDangerousSurface(proposal("Add a wallet auth flow."))).toBe(true);
  });

  it("does not flag negated safety constraints as dangerous work", () => {
    expect(findDangerousPromptFlags("Documentation-only. Do not deploy or change auth, payments, or wallet code.")).toEqual([]);
  });
});
