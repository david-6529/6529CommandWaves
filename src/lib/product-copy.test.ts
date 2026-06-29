import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.eyebrow).toBe("Project site");
    expect(commandWaveProductCopy.headline).toBe("6529 Hook");
    expect(commandWaveProductCopy.positioning).toBe("One wave. One repo. One public build.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Wave - Code - PR - Review");
  });

  it("keeps internal role names out of the first-screen explanation", () => {
    const firstScreenCopy = [
      commandWaveProductCopy.headline,
      commandWaveProductCopy.subhead,
      commandWaveProductCopy.positioning,
      commandWaveProductCopy.simpleFlow,
    ].join(" ");

    expect(firstScreenCopy.toLowerCase()).not.toContain("genesis");
    expect(firstScreenCopy.toLowerCase()).not.toContain("orchestrator");
    expect(firstScreenCopy.toLowerCase()).not.toContain("guardian");
  });

  it("keeps the standalone project ahead of the later reusable infrastructure", () => {
    expect(commandWaveProductCopy.headline).toBe("6529 Hook");
    expect(commandWaveProductCopy.subhead).toContain("The 6529 wave holds discussion and decisions");
    expect(commandWaveProductCopy.subhead).toContain("GitHub work easy to inspect");
    expect(commandWaveProductCopy.positioning).toContain("One wave");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
