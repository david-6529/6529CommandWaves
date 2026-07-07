import { describe, expect, it } from "vitest";
import { evaluateHookParameterPolicy, hasExplicitHookParameterBound } from "./hook-parameter-policy";

describe("hook parameter policy", () => {
  it("passes parameter work with an explicit cap and bound tests", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText:
        "Add hook fee parameters capped at 100 bps. Include tests for the 100 bps fee cap and parameter bounds.",
    });

    expect(checks.every((item) => item.status === "pass")).toBe(true);
    expect(hasExplicitHookParameterBound("fee parameters capped at 100 bps")).toBe(true);
  });

  it("fails vague parameter work without a numeric cap", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText: "Add tweakable hook fee parameters with tests.",
    });

    expect(checks.find((item) => item.id === "hook_parameter_explicit_bound")?.status).toBe("fail");
  });

  it("requires PR-side test evidence when patches write parameters", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText:
        "Add hook fee parameters capped at 100 bps. Include tests for the 100 bps fee cap and parameter bounds.",
      changedPaths: ["contracts/HookParameters.sol"],
      hookPatchSignals: [
        {
          label: "parameter_write",
          risk: "high",
          path: "contracts/HookParameters.sol",
          line: "feeBps = nextFeeBps;",
          reason: "Added Solidity code writes hook fee, cap, limit, parameter, or config state.",
          defaultBlocked: false,
        },
      ],
    });

    expect(checks.find((item) => item.id === "hook_parameter_pr_bound_tests")).toMatchObject({
      status: "fail",
      message: "PR changes that write hook parameters must include a changed bound-focused test file.",
    });
  });

  it("passes parameter-write patches with changed bound test evidence", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText:
        "Add hook fee parameters capped at 100 bps. Include tests for the 100 bps fee cap and parameter bounds.",
      changedPaths: ["contracts/HookParameters.sol", "test/HookParameters.t.sol"],
      changedFiles: [
        {
          path: "test/HookParameters.t.sol",
          patch: "@@\n+function testFeeCap100Bps() public { assertEq(maxFeeBps, 100); }",
        },
      ],
      hookPatchSignals: [
        {
          label: "parameter_write",
          risk: "high",
          path: "contracts/HookParameters.sol",
          line: "feeBps = nextFeeBps;",
          reason: "Added Solidity code writes hook fee, cap, limit, parameter, or config state.",
          defaultBlocked: false,
        },
      ],
    });

    expect(checks.find((item) => item.id === "hook_parameter_pr_bound_tests")).toMatchObject({
      status: "pass",
      message: "PR changes include test evidence for the bounded parameter write.",
    });
  });

  it("does not treat negated parameter text as requested work", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText: "Draft docs only. No parameter changes.",
    });

    expect(checks.find((item) => item.id === "hook_parameter_not_requested")?.status).toBe("pass");
  });

  it("fails live REP or TDH authority claims until weighting is wired", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText: "Allow 30% of TDH holders to change the hook fee cap.",
    });

    expect(checks.find((item) => item.id === "hook_parameter_live_holder_authority")?.status).toBe("fail");
  });

  it("allows REP or TDH text when it is explicitly non-enforced", () => {
    const checks = evaluateHookParameterPolicy({
      proposalText: "REP or TDH access checks are planned, not enforced here.",
    });

    expect(checks.find((item) => item.id === "hook_parameter_live_holder_authority")?.status).toBe("pass");
  });
});
