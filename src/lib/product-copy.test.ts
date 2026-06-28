import { describe, expect, it } from "vitest";
import { commandWaveProductCopy } from "./product-copy";

describe("Command Waves product copy", () => {
  it("keeps the primary product message simple and user-facing", () => {
    expect(commandWaveProductCopy.headline).toBe("Build the 6529 hook in public.");
    expect(commandWaveProductCopy.simpleFlow).toBe("Choose project - Propose work - Decide - Build PR - Review - Log");
    expect(commandWaveProductCopy.steps.map((step) => step.title)).toEqual([
      "Choose the project",
      "Approve scoped work",
      "Build and review",
    ]);
  });

  it("keeps internal role names out of the first-screen explanation", () => {
    const firstScreenCopy = [
      commandWaveProductCopy.headline,
      commandWaveProductCopy.subhead,
      commandWaveProductCopy.simpleFlow,
      ...commandWaveProductCopy.steps.flatMap((step) => [step.title, step.body]),
    ].join(" ");

    expect(firstScreenCopy.toLowerCase()).not.toContain("genesis");
    expect(firstScreenCopy.toLowerCase()).not.toContain("orchestrator");
    expect(firstScreenCopy.toLowerCase()).not.toContain("guardian");
  });
});
