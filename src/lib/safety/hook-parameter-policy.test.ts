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
      proposalText: "REP or TDH gates are planned, not enforced here.",
    });

    expect(checks.find((item) => item.id === "hook_parameter_live_holder_authority")?.status).toBe("pass");
  });
});
