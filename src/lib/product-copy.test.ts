import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("Build the 6529 hook together");
    expect(commandWaveProductCopy.subhead).toBe("Coordinate one small hook change from room discussion to reviewed PR.");
    expect(commandWaveProductCopy.positioning).toBe("One change at a time.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Discuss, Decide, PR, Review");
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
    expect(commandWaveProductCopy.headline).toBe("Build the 6529 hook together");
    expect(commandWaveProductCopy.headline.toLowerCase()).toContain("6529 hook");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("discussion");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("pr");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("review");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
