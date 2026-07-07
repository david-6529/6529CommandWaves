import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const launchEnvVars = [
  "NEXT_PUBLIC_APP_URL",
  "COMMAND_WAVE_STORE",
  "DATABASE_URL",
  "ADMIN_API_KEY",
  "COMMAND_WAVE_INITIAL_WAVE_URL",
  "COMMAND_WAVE_INITIAL_REPO_URL",
  "6529_MOCK_MODE=false",
  "6529_BOT_BEARER_TOKEN",
  "6529_BOT_WALLET_ADDRESS",
  "COMMAND_WAVE_STATE_URL",
  "COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK",
  "COMMAND_WAVE_REPO_ADAPTER=github",
  "COMMAND_WAVE_GITHUB_TOKEN",
];

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("launch docs", () => {
  it("keeps copied launch env snippets aligned with required setup", () => {
    const docs = [
      readRepoFile("README.md"),
      readRepoFile("docs/first-hook-launch-playbook.md"),
      readRepoFile(".env.production.example"),
    ];

    for (const doc of docs) {
      for (const name of launchEnvVars) {
        expect(doc).toContain(name);
      }
    }
  });

  it("documents the required GitHub guardian check outside env files", () => {
    const readme = readRepoFile("README.md");
    const playbook = readRepoFile("docs/first-hook-launch-playbook.md");

    expect(readme).toContain("must be required in GitHub branch protection or rulesets");
    expect(playbook).toContain("Make `COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK` required in GitHub branch protection or rulesets.");
  });

  it("keeps reviewer placeholder docs aligned with this phase", () => {
    const docs = [readRepoFile("README.md"), readRepoFile("docs/mvp-plan.md")].join("\n");

    expect(docs).toContain("Review agent and GitHub repo are explicit placeholders for this phase");
    expect(docs).toContain("Reviewer checks are placeholders for this phase");
    expect(docs).not.toContain("production reviewer service is wired");
  });
});
