import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.eyebrow).toBe("Builder swarm");
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Builder Swarm");
    expect(commandWaveProductCopy.positioning).toBe("Start with the 6529 hook. Keep the loop reusable for public open source builds.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Gate - Wave - PR - Review");
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
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Builder Swarm");
    expect(commandWaveProductCopy.subhead).toContain("gated builder wave");
    expect(commandWaveProductCopy.subhead).toContain("orchestration rules");
    expect(commandWaveProductCopy.subhead).toContain("reviewer CI");
    expect(commandWaveProductCopy.positioning).toContain("Start with the 6529 hook");
    expect(commandWaveProductCopy.positioning).toContain("public open source builds");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
