import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("Decentralized Coding");
    expect(commandWaveProductCopy.subhead).toBe("A new form of swarm development for the age of AI");
    expect(commandWaveProductCopy.projectContext).toBe("6529 Hook room: one public wave and one GitHub repo.");
    expect(commandWaveProductCopy.positioning).toBe("One change at a time.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Discuss, Decide, PR, Review");
  });

  it("keeps unsafe authority claims out of the first-screen explanation", () => {
    const firstScreenCopy = [
      commandWaveProductCopy.headline,
      commandWaveProductCopy.subhead,
      commandWaveProductCopy.projectContext,
      commandWaveProductCopy.positioning,
      commandWaveProductCopy.simpleFlow,
    ].join(" ");

    expect(firstScreenCopy.toLowerCase()).not.toContain("guardian");
    expect(firstScreenCopy.toLowerCase()).not.toContain("auto-merge");
    expect(firstScreenCopy.toLowerCase()).not.toContain("automatic payout");
    expect(firstScreenCopy.toLowerCase()).not.toContain("live rep");
  });

  it("keeps the product framing broad without marketplace claims", () => {
    expect(commandWaveProductCopy.headline).toBe("Decentralized Coding");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("swarm development");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("ai");
    expect(commandWaveProductCopy.projectContext).toContain("6529 Hook");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
