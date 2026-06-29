import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Workspace");
    expect(commandWaveProductCopy.subhead).toBe("A live workspace for the swarm coordinating the next hook change.");
    expect(commandWaveProductCopy.positioning).toBe(
      "Read the current task, talk in the builder wave, propose one scoped change, and keep PR review visible.",
    );
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
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Workspace");
    expect(commandWaveProductCopy.subhead).toContain("next hook change");
    expect(commandWaveProductCopy.positioning).toContain("talk in the builder wave");
    expect(commandWaveProductCopy.positioning.toLowerCase()).toContain("current task");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
