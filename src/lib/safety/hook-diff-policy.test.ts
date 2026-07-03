import { describe, expect, it } from "vitest";
import { findHookPatchSignals, normalizeChangedFiles, riskAllowsHookPatchSignal } from "./hook-diff-policy";

describe("hook diff policy", () => {
  it("detects risky Solidity additions from patch content", () => {
    const signals = findHookPatchSignals([
      {
        path: "contracts/Hook.sol",
        patch: [
          "@@",
          "+contract Hook is UUPSUpgradeable, Ownable {",
          "+  function _authorizeUpgrade(address nextImplementation) internal override onlyOwner {}",
          "+  function setFeeBps(uint16 nextFeeBps) external { feeBps = nextFeeBps; }",
          "+  function run(address target, bytes calldata data) external { target.delegatecall(data); }",
          "+  function destroy() external { selfdestruct(payable(msg.sender)); }",
          "+}",
        ].join("\n"),
      },
      {
        path: "README.md",
        patch: "@@\n+UUPSUpgradeable in docs should not count.",
      },
    ]);

    expect(signals).toContainEqual(expect.objectContaining({ label: "upgradeability_pattern", risk: "critical" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "governance_authority", risk: "critical" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "parameter_write", risk: "high" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "delegatecall", risk: "critical" }));
    expect(signals).toContainEqual(expect.objectContaining({ label: "destructive_opcode", risk: "critical" }));
    expect(signals.every((signal) => signal.path.endsWith(".sol"))).toBe(true);
  });

  it("requires an explicit exception for upgradeability patch signals", () => {
    const [signal] = findHookPatchSignals([
      {
        path: "contracts/Hook.sol",
        patch: "@@\n+contract Hook is UUPSUpgradeable {}",
      },
    ]);

    expect(signal).toBeDefined();
    expect(riskAllowsHookPatchSignal({ risk: "critical", signal: signal! })).toBe(false);
    expect(riskAllowsHookPatchSignal({ risk: "critical", signal: signal!, upgradeabilityExceptionApproved: true })).toBe(
      true,
    );
  });

  it("keeps delegatecall and destructive opcodes blocked by default", () => {
    const signals = findHookPatchSignals([
      {
        path: "contracts/Hook.sol",
        patch: [
          "@@",
          "+function run(address target, bytes calldata data) external { target.delegatecall(data); }",
          "+function destroy() external { selfdestruct(payable(msg.sender)); }",
        ].join("\n"),
      },
    ]);

    expect(signals).toHaveLength(2);
    expect(
      signals.every((signal) =>
        riskAllowsHookPatchSignal({ risk: "critical", signal, upgradeabilityExceptionApproved: true }) === false,
      ),
    ).toBe(true);
  });

  it("normalizes changed files before hashing", () => {
    expect(
      normalizeChangedFiles([
        { path: "contracts/B.sol" },
        { path: " contracts/A.sol ", patch: "@@\n+contract A {}" },
      ]),
    ).toEqual([
      { path: "contracts/A.sol", patch: "@@\n+contract A {}" },
      { path: "contracts/B.sol", patch: null },
    ]);
  });
});
