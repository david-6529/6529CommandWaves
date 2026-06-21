import { describe, expect, it } from "vitest";
import { humanizeLegacyCommandCopy } from "./legacy-copy";

describe("legacy command copy", () => {
  it("maps old internal role language to current user-facing terms", () => {
    expect(humanizeLegacyCommandCopy("Genesis Agent updated setup.")).toBe("Setup updated setup.");
    expect(humanizeLegacyCommandCopy("Orchestrator Agent executed through orchestrator execution.")).toBe(
      "AI Worker executed through AI worker run.",
    );
    expect(humanizeLegacyCommandCopy("Guardian review passed by Guardian Agent.")).toBe("Review passed by Reviewer.");
  });
});
