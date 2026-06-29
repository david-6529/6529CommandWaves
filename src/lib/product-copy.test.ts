import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.eyebrow).toBe("Public hook build");
    expect(commandWaveProductCopy.headline).toBe("Build a hook together");
    expect(commandWaveProductCopy.positioning).toBe(
      "You do not need to know Waves or 6529 to start. Read the rules, ask the swarm, or suggest one small change.",
    );
    expect(commandWaveProductCopy.simpleFlow).toBe("Talk - Agree - Build - Review");
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
    expect(commandWaveProductCopy.headline).toBe("Build a hook together");
    expect(commandWaveProductCopy.subhead).toContain("shared room");
    expect(commandWaveProductCopy.subhead).toContain("6529 hook");
    expect(commandWaveProductCopy.positioning).toContain("do not need to know Waves");
    expect(commandWaveProductCopy.positioning).toContain("suggest one small change");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
