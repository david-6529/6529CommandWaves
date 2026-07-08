import { describe, expect, it } from "vitest";
import { contributorRulesReferenceLine, projectRepoLine, projectRepoText } from "./project-repo-copy";

describe("project repo copy", () => {
  it("labels placeholder repos without making them look active", () => {
    const placeholder = "https://github.com/your-org/your-hook-repo";

    expect(projectRepoText(placeholder)).toBe(
      "GitHub repo placeholder (No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.)",
    );
    expect(projectRepoLine("GitHub repo", placeholder)).toBe(
      "GitHub repo: GitHub repo placeholder (No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.)",
    );
    expect(contributorRulesReferenceLine(placeholder)).toBeNull();
  });

  it("keeps configured GitHub repos linkable", () => {
    const repo = "https://github.com/builders/hook";

    expect(projectRepoLine("Repo", repo)).toBe("Repo: https://github.com/builders/hook");
    expect(contributorRulesReferenceLine(repo)).toBe(
      "Contributor rules: https://github.com/builders/hook/blob/main/CONTRIBUTING.md",
    );
  });
});
