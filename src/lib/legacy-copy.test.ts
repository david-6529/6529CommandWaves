import { describe, expect, it } from "vitest";
import { humanizeLegacyCommandCopy } from "./legacy-copy";

describe("legacy command copy", () => {
  it("maps old internal role language to current user-facing terms", () => {
    expect(humanizeLegacyCommandCopy("Genesis Agent updated setup.")).toBe("Setup updated setup.");
    expect(humanizeLegacyCommandCopy("Orchestrator Agent executed through orchestrator execution.")).toBe(
      "Orchestrator executed through orchestrator run.",
    );
    expect(humanizeLegacyCommandCopy("Guardian review passed by Guardian Agent.")).toBe("Review passed by Reviewer.");
    expect(humanizeLegacyCommandCopy("Local agent mock opened a PR.")).toBe("Agent adapter opened a PR.");
    expect(humanizeLegacyCommandCopy("Reviewer mock passed.")).toBe("Reviewer adapter passed.");
  });

  it("maps old hook builder product language to the current project framing", () => {
    expect(humanizeLegacyCommandCopy("Created 6529 Hook Builder and attached the builder wave plus GitHub repo.")).toBe(
      "Created 6529 AMM hook and attached the project chat and GitHub repo.",
    );
    expect(humanizeLegacyCommandCopy("Builder wave approved cmd-001.")).toBe("Project chat approved cmd-001.");
    expect(humanizeLegacyCommandCopy("Wave Poll recorded a builder 6529 decision receipt.")).toBe(
      "Decision recorded a project decision link.",
    );
    expect(humanizeLegacyCommandCopy("Wave Poll recorded a builder wave decision receipt.")).toBe(
      "Decision recorded a project decision link.",
    );
    expect(humanizeLegacyCommandCopy("Room approved cmd-001 with 5 yes and 1 no.")).toBe(
      "Builders approved the hook scaffold with 5 yes and 1 no.",
    );
    expect(humanizeLegacyCommandCopy("cmd-001 passed with 5 yes, 1 no, and a project decision receipt.")).toBe(
      "Builders approved the hook scaffold with 5 yes and 1 no.",
    );
    expect(humanizeLegacyCommandCopy("cmd-001 passed with 5 yes, 1 no, and a 6529 decision receipt.")).toBe(
      "Builders approved the hook scaffold with 5 yes and 1 no.",
    );
    expect(humanizeLegacyCommandCopy("Project decision passed for cmd-001 with quorum met.")).toBe(
      "Builders approved the hook scaffold proposal.",
    );
    expect(
      humanizeLegacyCommandCopy("Marked the hook scaffold high risk. Builder decision required: quorum 3, yes 60%."),
    ).toBe("Marked the hook scaffold high risk. Project decision required: quorum 3, yes 60%.");
    expect(humanizeLegacyCommandCopy("Review passed cmd-001. The hook scaffold matched the vote and rules.")).toBe(
      "Review passed the hook scaffold. It matched the builder decision and rules.",
    );
  });
});
