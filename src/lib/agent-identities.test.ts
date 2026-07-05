import { describe, expect, it } from "vitest";
import { githubRepoPlaceholder, orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";

describe("agent identities", () => {
  it("sets daemon as the 6529 orchestrator account", () => {
    expect(orchestratorAgentIdentity).toMatchObject({
      handle: "daemon",
      accountType: "6529 account",
      status: "active",
      role: "Orchestrator",
    });
  });

  it("keeps review and repo surfaces marked as placeholders", () => {
    expect(reviewAgentIdentity.status).toBe("placeholder");
    expect(githubRepoPlaceholder.status).toBe("placeholder");
    expect(JSON.stringify({ reviewAgentIdentity, githubRepoPlaceholder })).not.toContain("\u2014");
  });
});
