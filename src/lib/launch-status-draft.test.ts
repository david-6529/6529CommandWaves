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
    expect(draft).toContain(`Builder wave: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("Status: checks needed");
    expect(draft).toContain("Next action: Run launch setup check");
    expect(draft).toContain("- Setup check: Verify the wave, repo, contributor rules, and PR template before inviting contributors.");
    expect(draft).toContain(`- Setup proof: ${verificationTargets.setupProofUrl}`);
    expect(draft).toContain(`- Command-wave state: ${verificationTargets.commandWaveStateUrl}`);
    expect(draft).toContain(`- Launch audit: ${verificationTargets.launchAuditUrl}`);
    expect(draft).toContain("does not approve work or move funds");
    expect(draft).not.toContain("\u2014");
  });

  it("states when checked evidence has no launch gaps", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: getReadinessChecks({
        NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
        ADMIN_API_KEY: "admin",
        "6529_MOCK_MODE": "false",
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
    expect(draft).toContain("- No launch gaps found in the checked evidence.");
    expect(draft).not.toContain("\u2014");
  });
});
