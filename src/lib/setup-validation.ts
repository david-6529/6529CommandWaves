import { getWave, normalizeWaveId } from "./6529/client";
import { is6529MockMode } from "./6529/mock";
import {
  getGitHubRepoMetadata,
  getGitHubRepoRequiredFiles,
  parseGitHubRepoUrl,
  type GitHubRepoApiOptions,
  type GitHubRepoMetadata,
  type GitHubRepoRef,
  type GitHubRepoRequiredFile,
} from "./github/repo";

export type SetupCheckStatus = "pass" | "warn" | "fail";

export type SetupCheck = {
  id: string;
  label: string;
  status: SetupCheckStatus;
  message: string;
};

export type SetupValidationInput = {
  waveUrl?: unknown;
  repoUrl?: unknown;
};

export type SetupValidation = {
  waveId: string | null;
  repo: GitHubRepoRef | null;
  repoMetadata: GitHubRepoMetadata | null;
  repoRequiredFiles: GitHubRepoRequiredFile[];
  checks: SetupCheck[];
  canSave: boolean;
  canRunCode: boolean;
};

type ValidationOptions = {
  checkWaveRemote?: boolean;
  checkRepoRemote?: boolean;
  githubApi?: GitHubRepoApiOptions;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function check(id: string, label: string, status: SetupCheckStatus, message: string): SetupCheck {
  return { id, label, status, message };
}

function hasFailures(checks: SetupCheck[]) {
  return checks.some((item) => item.status === "fail");
}

export function setupValidationNotice(validation: Pick<SetupValidation, "checks">) {
  const failCount = validation.checks.filter((item) => item.status === "fail").length;
  const warnCount = validation.checks.filter((item) => item.status === "warn").length;

  if (failCount) {
    return "Setup needs fixes before saving.";
  }

  if (warnCount) {
    return `Setup check found ${warnCount} launch warning${warnCount === 1 ? "" : "s"}.`;
  }

  return "Setup check passed.";
}

function repoFileCheckId(path: string) {
  return `repo_file_${path.replaceAll(/[^a-z0-9]+/gi, "_").replaceAll(/^_+|_+$/g, "").toLowerCase()}`;
}

export function validateSetupShape(input: SetupValidationInput): SetupValidation {
  const waveText = asText(input.waveUrl);
  const repoText = asText(input.repoUrl);
  const waveId = waveText ? normalizeWaveId(waveText) : "";
  const repo = parseGitHubRepoUrl(repoText);
  const checks: SetupCheck[] = [];

  checks.push(
    waveId
      ? check("wave_format", "6529 wave", "pass", `Using wave ${waveId}.`)
      : check("wave_format", "6529 wave", "fail", "Paste a 6529 wave link or wave id."),
  );

  checks.push(
    repo
      ? check("repo_format", "GitHub repo", "pass", `Using ${repo.owner}/${repo.repo}.`)
      : check("repo_format", "GitHub repo", "fail", "Use a GitHub URL or owner/repo shorthand."),
  );

  return {
    waveId: waveId || null,
    repo,
    repoMetadata: null,
    repoRequiredFiles: [],
    checks,
    canSave: !hasFailures(checks),
    canRunCode: !hasFailures(checks) && Boolean(repo),
  };
}

export async function validateCommandWaveSetup(
  input: SetupValidationInput,
  options: ValidationOptions = {},
): Promise<SetupValidation> {
  const validation = validateSetupShape(input);
  const checks = [...validation.checks];
  let repoMetadata: GitHubRepoMetadata | null = null;
  let repoRequiredFiles: GitHubRepoRequiredFile[] = [];

  if (options.checkWaveRemote && validation.waveId) {
    try {
      await getWave(validation.waveId);
      checks.push(
        check(
          "wave_reachable",
          "Wave reachable",
          "pass",
          is6529MockMode() ? "Mock 6529 wave is reachable." : "Live 6529 wave is reachable.",
        ),
      );
    } catch (error) {
      checks.push(
        check(
          "wave_reachable",
          "Wave reachable",
          "fail",
          error instanceof Error ? error.message : "Could not read this 6529 wave.",
        ),
      );
    }
  }

  if (options.checkRepoRemote && validation.repo) {
    try {
      repoMetadata = await getGitHubRepoMetadata(validation.repo.htmlUrl, options.githubApi);
      checks.push(
        check(
          "repo_reachable",
          "Repo reachable",
          repoMetadata.archived ? "warn" : "pass",
          repoMetadata.archived
            ? "GitHub repo exists but is archived."
            : `GitHub repo exists. Default branch: ${repoMetadata.defaultBranch ?? "unknown"}.`,
        ),
      );

      try {
        repoRequiredFiles = await getGitHubRepoRequiredFiles(validation.repo.htmlUrl, {
          ...options.githubApi,
          ref: options.githubApi?.ref ?? repoMetadata.defaultBranch,
        });
        checks.push(
          ...repoRequiredFiles.map((file) =>
            check(
              repoFileCheckId(file.path),
              file.label,
              file.exists ? "pass" : "warn",
              file.exists ? `${file.path} is present.` : `${file.path} is missing. Add it before inviting contributors.`,
            ),
          ),
        );
      } catch (error) {
        checks.push(
          check(
            "repo_required_files",
            "Required repo files",
            "warn",
            error instanceof Error
              ? `Could not verify CONTRIBUTING.md and PR template: ${error.message}`
              : "Could not verify CONTRIBUTING.md and PR template.",
          ),
        );
      }
    } catch (error) {
      checks.push(
        check(
          "repo_reachable",
          "Repo reachable",
          "fail",
          error instanceof Error ? error.message : "Could not read this GitHub repo.",
        ),
      );
    }
  }

  return {
    ...validation,
    repoMetadata,
    repoRequiredFiles,
    checks,
    canSave: !hasFailures(checks),
    canRunCode: !hasFailures(checks) && Boolean(validation.repo),
  };
}
