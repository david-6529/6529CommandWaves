import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("6529 Hook");
    expect(commandWaveProductCopy.subhead).toBe("A shared workspace for the swarm building the hook together.");
    expect(commandWaveProductCopy.positioning).toBe("Track the active change, talk through decisions, and keep PR review visible.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Discuss - Decide - Build - Review");
  });

  it("keeps unsafe authority claims out of the first-screen explanation", () => {
    const firstScreenCopy = [
      commandWaveProductCopy.headline,
      commandWaveProductCopy.subhead,
      commandWaveProductCopy.positioning,
      commandWaveProductCopy.simpleFlow,
    ].join(" ");

    expect(firstScreenCopy.toLowerCase()).not.toContain("guardian");
    expect(firstScreenCopy.toLowerCase()).not.toContain("auto-merge");
    expect(firstScreenCopy.toLowerCase()).not.toContain("automatic payout");
    expect(firstScreenCopy.toLowerCase()).not.toContain("live rep");
  });

  it("keeps the first hook ahead of the later reusable protocol", () => {
    expect(commandWaveProductCopy.headline).toBe("6529 Hook");
    expect(commandWaveProductCopy.subhead).toContain("building the hook");
    expect(commandWaveProductCopy.positioning).toContain("talk through decisions");
    expect(commandWaveProductCopy.positioning.toLowerCase()).toContain("active change");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
