import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createLaunchStatusDraft } from "./launch-status-draft";
import { createPhaseChecklist } from "./phase-checklist";
import { getReadinessChecks } from "./system/readiness";

const verificationTargets = {
  setupProofUrl: "https://command-waves.example.com/api/command-wave/setup/proof",
  commandWaveStateUrl: "https://command-waves.example.com/api/command-wave/state",
  launchAuditUrl: "https://command-waves.example.com/api/command-wave/launch/audit",
};

describe("launch status draft", () => {
  it("summarizes open launch items for the builder wave", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: null,
      wave: demoWave,
    });
    const draft = createLaunchStatusDraft({ wave: demoWave, audit, verificationTargets });

    expect(draft).toContain("6529 hook launch status");
    expect(draft).toContain(`6529 discussion: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Code repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("Status: checks needed");
    expect(draft).toContain("Next action: Run launch setup check");
    expect(draft).toContain("- Setup check: Verify the wave, repo, contributor rules, and PR template before inviting contributors.");
    expect(draft).toContain("Operator checklist:");
    expect(draft).toContain("- Run the setup check against the selected project room and GitHub repo.");
    expect(draft).toContain("- Run launch readiness from the app or /api/command-wave/launch/audit?remote=1.");
    expect(draft).toContain(`- Setup proof: ${verificationTargets.setupProofUrl}`);
    expect(draft).toContain(`- Command-wave state: ${verificationTargets.commandWaveStateUrl}`);
    expect(draft).toContain(`- Launch audit: ${verificationTargets.launchAuditUrl}`);
    expect(draft).toContain("does not approve work or move funds");
    expect(draft).not.toContain("\u2014");
  });

  it("states when checked records have no launch gaps", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
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
      }),
      setupValidation: {
        waveId: "6529-hook-builder",
        repo: {
          owner: "6529-Collections",
          repo: "6529-hook",
          htmlUrl: "https://github.com/6529-Collections/6529-hook",
        },
        repoMetadata: null,
        repoRequiredFiles: [],
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
        ],
        canSave: true,
        canRunCode: true,
      },
      wave: demoWave,
    });
    const draft = createLaunchStatusDraft({ wave: demoWave, audit, verificationTargets });

    expect(audit.status).toBe("ready");
    expect(draft).toContain("Status: ready");
    expect(draft).toContain("Next action: Start the first public loop");
    expect(draft).toContain("- No launch gaps found in the checked records.");
    expect(draft).toContain("- Start the first public loop with one small reviewed hook change.");
    expect(draft).not.toContain("\u2014");
  });

  it("names production env work in copied launch status", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: getReadinessChecks({ NODE_ENV: "production" }),
      wave: demoWave,
    });
    const draft = createLaunchStatusDraft({ wave: demoWave, audit, verificationTargets });

    expect(draft).toContain("Operator checklist:");
    expect(draft).toContain("- Set a strong ADMIN_API_KEY before public launch.");
    expect(draft).toContain("- Set NEXT_PUBLIC_APP_URL to the deployed HTTPS app URL.");
    expect(draft).toContain("- Set COMMAND_WAVE_INITIAL_WAVE_URL to the first project room.");
    expect(draft).toContain("- Set COMMAND_WAVE_INITIAL_REPO_URL to the hook GitHub repo.");
    expect(draft).toContain("- Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.");
    expect(draft).toContain("- Set COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN with repo access.");
    expect(draft).toContain(
      "- Set COMMAND_WAVE_STATE_URL to the deployed /api/command-wave/state URL for guardian PR checks.",
    );
    expect(draft).not.toContain("\u2014");
  });
});
