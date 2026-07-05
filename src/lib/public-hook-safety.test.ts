import { describe, expect, it } from "vitest";
import { publicHookSafety } from "./public-hook-safety";

describe("public hook safety", () => {
  it("publishes the immutable hook rules in a public shape", () => {
    expect(publicHookSafety).toMatchObject({
      immutableDefault: true,
      summary: "Hook contracts are immutable by default. Parameter changes need explicit caps and bound-focused tests.",
    });
    expect(publicHookSafety.parameterPolicy.join(" ")).toContain("immutable by default");
    expect(publicHookSafety.parameterPolicy.join(" ")).toContain("explicit cap");
    expect(publicHookSafety.parameterPolicy.join(" ")).toContain("bound-focused tests");
    expect(publicHookSafety.blockedInPhaseOne.join(" ")).toContain("Upgradeable");
    expect(publicHookSafety.blockedInPhaseOne.join(" ")).toContain("delegatecall");
    expect(publicHookSafety.blockedInPhaseOne.join(" ")).toContain("Deploy scripts");
    expect(publicHookSafety.reviewEvidence.join(" ")).toContain("rules hash");
    expect(publicHookSafety.reviewEvidence.join(" ")).toContain("wave state hash");
  });

  it("does not emit em dash characters", () => {
    expect(JSON.stringify(publicHookSafety)).not.toContain("\u2014");
  });
});
