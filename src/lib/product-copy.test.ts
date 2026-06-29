import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("Coordinate the next 6529 hook change");
    expect(commandWaveProductCopy.subhead).toBe("A shared workspace for the people building the hook together.");
    expect(commandWaveProductCopy.positioning).toBe(
      "Use it to discuss the task, record the 6529 decision, build the PR, and review the result.",
    );
    expect(commandWaveProductCopy.simpleFlow).toBe("Task - Discussion - PR - Review");
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
    expect(commandWaveProductCopy.headline).toBe("Coordinate the next 6529 hook change");
    expect(commandWaveProductCopy.headline).toContain("6529 hook");
    expect(commandWaveProductCopy.positioning).toContain("6529 decision");
    expect(commandWaveProductCopy.positioning.toLowerCase()).toContain("the task");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
