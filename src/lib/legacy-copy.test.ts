import { describe, expect, it } from "vitest";
import { humanizeLegacyCommandCopy } from "./legacy-copy";

describe("legacy command copy", () => {
  it("maps old internal role language to current user-facing terms", () => {
    expect(humanizeLegacyCommandCopy("Genesis Agent updated setup.")).toBe("Setup updated setup.");
    expect(humanizeLegacyCommandCopy("Orchestrator Agent executed through orchestrator execution.")).toBe(
      "Agent executed through agent run.",
    );
    expect(humanizeLegacyCommandCopy("Guardian review passed by Guardian Agent.")).toBe("Review passed by Reviewer.");
    expect(humanizeLegacyCommandCopy("Local agent mock opened a PR.")).toBe("Agent adapter opened a PR.");
    expect(humanizeLegacyCommandCopy("Reviewer mock passed.")).toBe("Reviewer adapter passed.");
  });

  it("maps old hook builder product language to the current project framing", () => {
    expect(humanizeLegacyCommandCopy("Created 6529 Hook Builder and attached the builder wave plus GitHub repo.")).toBe(
      "Created Hook Build and attached the project room and code repo.",
    );
    expect(humanizeLegacyCommandCopy("Builder wave approved cmd-001.")).toBe("Room approved cmd-001.");
    expect(humanizeLegacyCommandCopy("Wave Poll recorded a builder 6529 decision receipt.")).toBe(
      "Decision recorded a room decision receipt.",
    );
    expect(humanizeLegacyCommandCopy("Wave Poll recorded a builder wave decision receipt.")).toBe(
      "Decision recorded a room decision receipt.",
    );
  });
});
