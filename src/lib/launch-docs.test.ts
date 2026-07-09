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

  it("keeps repo placeholder wording human-owned across launch docs", () => {
    const docs = [
      readRepoFile("README.md"),
      readRepoFile("docs/first-hook-launch-playbook.md"),
      readRepoFile(".env.example"),
      readRepoFile(".env.production.example"),
    ].join("\n");
    const stalePrWork = "until PR work " + "starts";
    const staleMaintainerSelect = "maintainers " + "select";

    expect(docs).toContain("until maintainers choose the hook repo");
    expect(docs).not.toContain(stalePrWork);
    expect(docs).not.toContain(staleMaintainerSelect);
  });

  it("documents the required GitHub guardian check outside env files", () => {
    const readme = readRepoFile("README.md");
    const playbook = readRepoFile("docs/first-hook-launch-playbook.md");

    expect(readme).toContain("must be required in GitHub branch protection or rulesets");
    expect(readme).toContain("copy `.github/workflows/guardian-review.yml` into the");
    expect(playbook).toContain("Make `COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK` required in GitHub branch protection or rulesets.");
    expect(playbook).toContain("the guardian workflow, and the required guardian check");
  });

  it("keeps reviewer placeholder docs aligned with this phase", () => {
    const docs = [readRepoFile("README.md"), readRepoFile("docs/mvp-plan.md"), readRepoFile("CONTRIBUTING.md")].join("\n");

    expect(docs).toContain("Review agent and GitHub repo are explicit placeholders for this phase");
    expect(docs).toContain("Reviewer checks are placeholders for this phase");
    expect(docs).toContain("The reviewer process is a placeholder for this phase");
    expect(docs).not.toContain("production reviewer service is wired");
  });

  it("documents the chat launch verifier separately from the full PR-loop audit", () => {
    const docs = [readRepoFile("README.md"), readRepoFile("docs/first-hook-launch-playbook.md")].join("\n");

    expect(readRepoFile("package.json")).toContain("\"chat:launch\"");
    expect(docs).toContain("CHAT_LAUNCH_URL");
    expect(docs).toContain("/api/command-wave/launch/chat?remote=1");
    expect(docs).toContain("npm run chat:launch");
    expect(docs).toContain("npm run launch:audit");
    expect(docs).toContain("reviewed PR loop");
    expect(docs).toContain("Group discussion");
    expect(docs).toContain("daemon-observed group discussion");
    expect(docs).toContain("daemon parses a builder message");
  });

  it("documents the public verification manifest", () => {
    const readme = readRepoFile("README.md");

    expect(readme).toContain("/api/command-wave/verification/manifest");
    expect(readme).toContain("required hash fields");
    expect(readme).toContain("chat posting capability");
    expect(readme).toContain("its own manifest URL");
  });

  it("uses decision link copy in public launch docs", () => {
    const docs = [
      readRepoFile("README.md"),
      readRepoFile("docs/mvp-plan.md"),
      readRepoFile("docs/first-hook-launch-playbook.md"),
      readRepoFile("docs/agent-harness-plan.md"),
      readRepoFile("docs/github-reviewer-gate.md"),
    ].join("\n");
    const staleDecision = "decision " + "receipt";
    const staleApproval = "approval " + "receipt";
    const staleVote = "vote or " + "receipt";

    expect(docs).toContain("decision link");
    expect(docs).not.toMatch(new RegExp(`${staleDecision}s?`, "i"));
    expect(docs).not.toMatch(new RegExp(staleApproval, "i"));
    expect(docs).not.toMatch(new RegExp(staleVote, "i"));
  });
});
