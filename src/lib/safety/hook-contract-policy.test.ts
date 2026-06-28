import { describe, expect, it } from "vitest";
import {
  findHookContractSignals,
  proposalAllowsUpgradeabilityException,
  riskAllowsHookContractSignal,
} from "./hook-contract-policy";

describe("hook contract policy", () => {
  it("detects contract, deployment, parameter, governance, and upgradeability signals", () => {
    const signals = findHookContractSignals({
      changedPaths: [
        "contracts/Hook.sol",
        "script/DeployHook.s.sol",
        "contracts/HookParameters.sol",
        "contracts/HookGovernor.sol",
        "contracts/UUPSProxy.sol",
      ],
      proposalText: "Add hook fee parameters capped at 100 bps.",
    });

    expect(signals).toContainEqual(expect.objectContaining({ label: "contract_code", risk: "medium" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "deployment", risk: "high" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "parameter_change", risk: "high" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "governance_change", risk: "critical" }));
    expect(signals).toContainEqual(
      expect.objectContaining({ label: "upgradeability", risk: "critical", defaultBlocked: true }),
    );
  });

  it("does not treat negated immutable-scope text as an upgradeability request", () => {
    const signals = findHookContractSignals({
      proposalText: "Draft a non-upgradeable hook. No proxy, no delegatecall, no deploy script, and no governance changes.",
    });

    expect(signals.some((signal) => signal.label === "upgradeability")).toBe(false);
    expect(signals.some((signal) => signal.label === "deployment")).toBe(false);
    expect(signals.some((signal) => signal.label === "governance_change")).toBe(false);
  });

  it("does not treat negated parameter text as a parameter change request", () => {
    const signals = findHookContractSignals({
      proposalText: "Update docs only. No parameter changes.",
    });

    expect(signals.some((signal) => signal.label === "parameter_change")).toBe(false);
  });

  it("requires an explicit exception before allowing upgradeability", () => {
    const [signal] = findHookContractSignals({
      proposalText: "Add a UUPS proxy to the hook.",
    }).filter((item) => item.label === "upgradeability");

    expect(signal).toBeDefined();
    expect(riskAllowsHookContractSignal({ risk: "critical", signal: signal! })).toBe(false);
    expect(proposalAllowsUpgradeabilityException("Explicit upgradeability exception approved by the wave.")).toBe(true);
    expect(
      riskAllowsHookContractSignal({
        risk: "critical",
        signal: signal!,
        upgradeabilityExceptionApproved: true,
      }),
    ).toBe(true);
  });
});
