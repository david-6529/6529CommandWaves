import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.eyebrow).toBe("Public Hook Projects");
    expect(commandWaveProductCopy.headline).toBe("Build hooks together.");
    expect(commandWaveProductCopy.positioning).toBe("Reusable for future public hooks. Focused first on 6529.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Wave - PR - Review - Log");
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

  it("keeps reusable infrastructure narrower than a broad platform", () => {
    expect(commandWaveProductCopy.headline).toContain("Build hooks together");
    expect(commandWaveProductCopy.subhead).toContain("Anyone can propose scoped work");
    expect(commandWaveProductCopy.positioning).toContain("Reusable for future public hooks");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
