import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createLaunchStatusDraft } from "./launch-status-draft";
import { createPhaseChecklist } from "./phase-checklist";
import { hashValue } from "./run-manifest";
import { getReadinessChecks } from "./system/readiness";

const verificationTargets = {
  verificationManifestUrl: "https://command-waves.example.com/api/command-wave/verification/manifest",
  setupProofUrl: "https://command-waves.example.com/api/command-wave/setup/proof",
  projectIndexUrl: "https://command-waves.example.com/api/command-wave/projects",
  contributionReportUrl: "https://command-waves.example.com/api/command-wave/reports/contribution",
  commandWaveStateUrl: "https://command-waves.example.com/api/command-wave/state",
  chatLaunchUrl: "https://command-waves.example.com/api/command-wave/launch/chat",
  launchAuditUrl: "https://command-waves.example.com/api/command-wave/launch/audit",
};

const configuredRepo = {
  owner: "6529-Collections",
  repo: "6529-hook",
  htmlUrl: "https://github.com/6529-Collections/6529-hook",
};

const configuredDemoWave = {
  ...demoWave,
  repoUrl: configuredRepo.htmlUrl,
  executions: demoWave.executions.map((execution) => ({
    ...execution,
    artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, configuredRepo.htmlUrl)),
  })),
  reviews: demoWave.reviews.map((review) => ({
    ...review,
    proof: review.proof
      ? {
          ...review.proof,
          inputs: {
            ...review.proof.inputs,
            repositoryHash: hashValue(configuredRepo),
          },
        }
      : review.proof,
  })),
};

describe("launch status draft", () => {
  it("summarizes open launch items for the project chat", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: null,
      wave: configuredDemoWave,
    });
    const draft = createLaunchStatusDraft({ wave: configuredDemoWave, audit, verificationTargets });

    expect(draft).toContain("Project launch status");
    expect(draft).toContain(`Project chat: ${configuredDemoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${configuredDemoWave.repoUrl}`);
    expect(draft).toContain("Chat launch: checks needed");
    expect(draft).toContain("Chat next action: Run project chat check");
    expect(draft).toContain("Status: checks needed");
    expect(draft).toContain("Next action: Run launch setup check");
    expect(draft).toContain(
      "- Setup check: Verify the project chat, repo, contributor rules, PR template, guardian workflow, and required guardian check before inviting contributors.",
    );
    expect(draft).toContain("Operator checklist:");
    expect(draft).toContain("- Run the setup check against the selected project chat and current repo setting.");
    expect(draft).toContain("- If the repo is still a placeholder, PR checks stay blocked until the hook repo is selected.");
    expect(draft).toContain("- Run launch readiness from the app or /api/command-wave/launch/audit?remote=1.");
    expect(draft).toContain(`- Verification manifest: ${verificationTargets.verificationManifestUrl}`);
    expect(draft).toContain(`- Setup proof: ${verificationTargets.setupProofUrl}`);
    expect(draft).toContain(`- Project index: ${verificationTargets.projectIndexUrl}`);
    expect(draft).toContain(`- Contribution report: ${verificationTargets.contributionReportUrl}`);
    expect(draft).toContain(`- Command-wave state: ${verificationTargets.commandWaveStateUrl}`);
    expect(draft).toContain(`- Chat launch audit: ${verificationTargets.chatLaunchUrl}`);
    expect(draft).toContain(`- Launch audit: ${verificationTargets.launchAuditUrl}`);
    expect(draft).toContain("does not approve work or move funds");
    expect(draft).not.toContain("\u2014");
  });

  it("states the reviewer process gap when checked records otherwise pass", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: getReadinessChecks({
        NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
        DATABASE_URL: "postgresql://command_waves:strong-password@db.internal:5432/command_waves",
        ADMIN_API_KEY: "strong-admin-key-for-launch",
        COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/6529-hook-builder",
        COMMAND_WAVE_INITIAL_REPO_URL: "https://github.com/6529-Collections/6529-hook",
        "6529_MOCK_MODE": "false",
        NODE_ENV: "production",
        COMMAND_WAVE_STORE: "postgres",
        COMMAND_WAVE_REPO_ADAPTER: "github",
        COMMAND_WAVE_GITHUB_TOKEN: "ghp_launch_readiness_token_1234567890",
        COMMAND_WAVE_STATE_URL: "https://command-waves.example.com/api/command-wave/state",
        "6529_BOT_BEARER_TOKEN": "6529-live-bot-token",
        "6529_BOT_WALLET_ADDRESS": "0x1234567890abcdef1234567890abcdef12345678",
      }),
      setupValidation: {
        waveId: "6529-hook-builder",
        repo: {
          owner: "6529-Collections",
          repo: "6529-hook",
          htmlUrl: "https://github.com/6529-Collections/6529-hook",
        },
        repoMetadata: null,
        repoRequiredFiles: [
          {
            path: "CONTRIBUTING.md",
            label: "Contributor rules",
            exists: true,
            valid: true,
            status: 200,
            message: "CONTRIBUTING.md is present.",
          },
          {
            path: ".github/PULL_REQUEST_TEMPLATE.md",
            label: "PR template",
            exists: true,
            valid: true,
            status: 200,
            message: ".github/PULL_REQUEST_TEMPLATE.md is present.",
          },
          {
            path: ".github/workflows/guardian-review.yml",
            label: "Guardian workflow",
            exists: true,
            valid: true,
            status: 200,
            message: ".github/workflows/guardian-review.yml is present.",
          },
        ],
        checks: [
          { id: "wave_reachable", label: "Wave reachable", status: "pass", message: "Live 6529 wave is reachable." },
          { id: "repo_reachable", label: "Repo reachable", status: "pass", message: "GitHub repo exists." },
          { id: "repo_file_contributing_md", label: "Contributor rules", status: "pass", message: "CONTRIBUTING.md is present." },
          {
            id: "repo_file_github_pull_request_template_md",
            label: "PR template",
            status: "pass",
            message: ".github/PULL_REQUEST_TEMPLATE.md is present.",
          },
          {
            id: "repo_file_github_workflows_guardian_review_yml",
            label: "Guardian workflow",
            status: "pass",
            message: ".github/workflows/guardian-review.yml is present.",
          },
          {
            id: "repo_required_guardian_check",
            label: "Required guardian check",
            status: "pass",
            message: "Command Waves Guardian is required by GitHub branch protection or rulesets.",
          },
        ],
        canSave: true,
        canRunCode: true,
      },
      wave: configuredDemoWave,
    });
    const draft = createLaunchStatusDraft({ wave: configuredDemoWave, audit, verificationTargets });

    expect(audit.status).toBe("needs_setup");
    expect(draft).toContain("Chat launch: ready");
    expect(draft).toContain("Chat next action: Open project chat");
    expect(draft).toContain("Status: checks needed");
    expect(draft).toContain("Next action: Select reviewer process");
    expect(draft).toContain(
      "- Review agent: Review agent is a placeholder. Select the reviewer process before claiming the reviewed PR loop is ready.",
    );
    expect(draft).toContain("- Select the reviewer process before claiming the reviewed PR loop is ready.");
    expect(draft).not.toContain("\u2014");
  });

  it("uses access-check wording for advisory participation notes", () => {
    const wave = {
      ...configuredDemoWave,
      gates: ["30% of TDH holders can contribute"],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: null,
      wave,
    });
    const draft = createLaunchStatusDraft({ wave, audit, verificationTargets });

    expect(draft).toContain("- Keep participation notes advisory until live access checks are implemented.");
    expect(draft).not.toContain("live gating");
  });

  it("names production env work in copied launch status", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: getReadinessChecks({ NODE_ENV: "production" }),
      wave: configuredDemoWave,
    });
    const draft = createLaunchStatusDraft({ wave: configuredDemoWave, audit, verificationTargets });

    expect(draft).toContain("Operator checklist:");
    expect(draft).toContain("- Set a strong ADMIN_API_KEY before public launch.");
    expect(draft).toContain("- Set NEXT_PUBLIC_APP_URL to the deployed HTTPS app URL.");
    expect(draft).toContain("- Set COMMAND_WAVE_INITIAL_WAVE_URL to the first project chat.");
    expect(draft).toContain("- Keep COMMAND_WAVE_INITIAL_REPO_URL as the placeholder until maintainers choose the hook repo.");
    expect(draft).toContain("- Set 6529_BOT_BEARER_TOKEN and 6529_BOT_WALLET_ADDRESS for daemon chat posting.");
    expect(draft).toContain("- Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.");
    expect(draft).toContain("- Set COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN with repo access.");
    expect(draft).toContain(
      "- Set COMMAND_WAVE_STATE_URL to the deployed /api/command-wave/state URL for guardian PR checks.",
    );
    expect(draft).not.toContain("\u2014");
  });
});
