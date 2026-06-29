import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("Hook Builder");
    expect(commandWaveProductCopy.subhead).toBe("Coordinate a community-built hook from idea to reviewed PR.");
    expect(commandWaveProductCopy.positioning).toBe(
      "Suggest one small change, discuss it with the swarm, record the wave decision, and review the code before merge.",
    );
    expect(commandWaveProductCopy.simpleFlow).toBe("Idea - Decision - PR - Review");
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
    expect(commandWaveProductCopy.headline).toBe("Hook Builder");
    expect(commandWaveProductCopy.subhead).toContain("community-built hook");
    expect(commandWaveProductCopy.positioning).toContain("record the wave decision");
    expect(commandWaveProductCopy.positioning.toLowerCase()).toContain("suggest one small change");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
