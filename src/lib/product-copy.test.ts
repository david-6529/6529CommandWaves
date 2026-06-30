import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Room");
    expect(commandWaveProductCopy.subhead).toBe(
      "Work on the 6529 hook with the room: discuss scope, record decisions, build PRs, and review before merge.",
    );
    expect(commandWaveProductCopy.positioning).toBe("A live room for the current 6529 hook change.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Live room");
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
    expect(commandWaveProductCopy.headline).toBe("6529 Hook Room");
    expect(commandWaveProductCopy.headline.toLowerCase()).toContain("6529 hook");
    expect(commandWaveProductCopy.subhead).toContain("Work on the 6529 hook");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("build prs");
    expect(commandWaveProductCopy.subhead.toLowerCase()).toContain("review");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("marketplace");
    expect(commandWaveProductCopy.positioning.toLowerCase()).not.toContain("swarm platform");
  });
});
