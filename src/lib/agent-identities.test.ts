import { describe, expect, it } from "vitest";
import {
  githubRepoPlaceholder,
  orchestratorAgentIdentity,
  publicGithubRepoPlaceholder,
  reviewAgentIdentity,
} from "./agent-identities";

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
    expect(githubRepoPlaceholder).toMatchObject({
      status: "placeholder",
      label: "GitHub repo placeholder",
      url: "https://github.com/your-org/your-hook-repo",
      description: "No real GitHub repo is connected yet.",
      nextStep: "Keep PR work blocked until the pilot repo is selected.",
    });
    expect(publicGithubRepoPlaceholder).toMatchObject({
      status: "placeholder",
      label: "GitHub repo placeholder",
      configuredUrl: null,
      description: "No real GitHub repo is connected yet.",
      nextStep: "Keep PR work blocked until the pilot repo is selected.",
    });
    expect(publicGithubRepoPlaceholder).not.toHaveProperty("url");
    expect(JSON.stringify({ reviewAgentIdentity, githubRepoPlaceholder, publicGithubRepoPlaceholder })).not.toContain(
      "\u2014",
    );
  });
});
