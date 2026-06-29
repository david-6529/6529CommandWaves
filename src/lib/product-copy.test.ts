import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.eyebrow).toBe("Public hook build");
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Project");
    expect(commandWaveProductCopy.positioning).toBe("One hook project today. A repeatable public build loop later.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Wave - Repo - PR - Review");
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
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Project");
    expect(commandWaveProductCopy.subhead).toContain("builder wave is deciding");
    expect(commandWaveProductCopy.subhead).toContain("happening in GitHub");
    expect(commandWaveProductCopy.positioning).toContain("One hook project today");
    expect(commandWaveProductCopy.positioning).toContain("repeatable public build loop later");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
