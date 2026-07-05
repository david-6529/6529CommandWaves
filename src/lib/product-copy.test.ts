import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("Decentralized Coding: Beta");
    expect(commandWaveProductCopy.subhead).toBe("A simple way for people and agents to build in public");
    expect(commandWaveProductCopy.projectContext).toBe("One public room, one repo, one reviewed change at a time.");
    expect(commandWaveProductCopy.positioning).toBe("One change at a time.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Project, Discuss, Decide, PR, Review, Log");
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
    expect(commandWaveProductCopy.headline).toBe("Decentralized Coding: Beta");
    expect(commandWaveProductCopy.subhead).toBe("A simple way for people and agents to build in public");
    expect(commandWaveProductCopy.projectContext).toBe("One public room, one repo, one reviewed change at a time.");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("people and agents");
    expect(commandWaveProductCopy.projectContext).not.toContain("6529");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
