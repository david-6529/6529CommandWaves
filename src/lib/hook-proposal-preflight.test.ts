import { describe, expect, it } from "vitest";
import { createHookProposalPreflight } from "./hook-proposal-preflight";

describe("hook proposal preflight", () => {
  it("passes the first hook scaffold command", () => {
    const preflight = createHookProposalPreflight({
      command: "Draft the non-upgradeable AMM hook scaffold with fee parameters capped at 100 bps and tests.",
      criteria:
        "Smart contract work only. No proxy, no delegatecall, no deploy script, no payments, and no governance changes. Include tests for the 100 bps fee cap.",
    });

    expect(preflight.status).toBe("pass");
    expect(preflight.statusLabel).toBe("clear");
    expect(preflight.checks.find((check) => check.id === "hook_parameter_explicit_bound")).toMatchObject({
      status: "pass",
    });
    expect(preflight.checks.find((check) => check.id === "hook_parameter_bound_tests")).toMatchObject({
      status: "pass",
    });
  });

  it("fails parameter work without an explicit cap and bound test evidence", () => {
    const preflight = createHookProposalPreflight({
      command: "Add a hook fee parameter.",
      criteria: "Make the fee configurable.",
    });

    expect(preflight.status).toBe("fail");
    expect(preflight.checks.find((check) => check.id === "hook_parameter_explicit_bound")).toMatchObject({
      status: "fail",
    });
    expect(preflight.checks.find((check) => check.id === "hook_parameter_bound_tests")).toMatchObject({
      status: "fail",
    });
  });

  it("fails deployment, governance, and upgradeability requests in phase 1", () => {
    const preflight = createHookProposalPreflight({
      command: "Deploy an upgradeable UUPS hook and transfer ownership to a Safe.",
      criteria: "Add governance threshold controls for future parameter changes.",
    });

    expect(preflight.status).toBe("fail");
    expect(preflight.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "deployment", status: "fail" }),
        expect.objectContaining({ label: "governance change", status: "fail" }),
        expect.objectContaining({ label: "upgradeability", status: "fail" }),
      ]),
    );
  });

  it("does not treat negated blocked language as a request", () => {
    const preflight = createHookProposalPreflight({
      command: "Draft a hook scaffold.",
      criteria: "No proxy, no deploy script, no governance changes, no owner roles.",
    });

    expect(preflight.checks.find((check) => check.id === "hook_proposal_blocked_language")).toMatchObject({
      status: "pass",
    });
  });

  it("fails live REP or TDH authority claims unless they are clearly non-enforced", () => {
    const liveAuthority = createHookProposalPreflight({
      command: "Let TDH holders control a hook fee parameter capped at 100 bps with bound tests.",
      criteria: "Use weighted voting for parameter changes.",
    });
    const plannedAuthority = createHookProposalPreflight({
      command: "Document planned TDH holder gates for a hook fee parameter capped at 100 bps with bound tests.",
      criteria: "The TDH gate is planned, not live, and not enforced here.",
    });

    expect(liveAuthority.status).toBe("fail");
    expect(liveAuthority.checks.find((check) => check.id === "hook_parameter_live_holder_authority")).toMatchObject({
      status: "fail",
    });
    expect(plannedAuthority.checks.find((check) => check.id === "hook_parameter_live_holder_authority")).toMatchObject({
      status: "pass",
    });
  });

  it("does not emit em dash characters", () => {
    const preflight = createHookProposalPreflight({
      command: "Add a hook fee parameter capped at 100 bps with bound tests.",
      criteria: "No deploy script.",
    });

    expect(JSON.stringify(preflight)).not.toContain("\u2014");
  });
});
