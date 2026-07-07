import { fetchJsonWithTimeout, fetchTextResponseWithTimeout } from "../http-fetch";
import { extractRequiredStatusChecks } from "./required-status-checks";

export type GitHubRepoRef = {
  owner: string;
  repo: string;
  htmlUrl: string;
};

export type GitHubRepoMetadata = GitHubRepoRef & {
  defaultBranch: string | null;
  private: boolean | null;
  archived: boolean | null;
};

export type GitHubRepoRequiredFile = {
  path: string;
  label: string;
  exists: boolean;
  valid: boolean;
  status: number;
  message: string;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type GitHubRepoApiOptions = {
  apiBaseUrl?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  ref?: string | null;
  token?: string;
};

export const requiredHookRepoFiles = [
  { path: "CONTRIBUTING.md", label: "Contributor rules" },
  { path: ".github/PULL_REQUEST_TEMPLATE.md", label: "PR template" },
  { path: ".github/workflows/guardian-review.yml", label: "Guardian workflow" },
] as const;

const commandPrManifestStart = "<!-- command-waves:manifest:start -->";
const commandPrManifestEnd = "<!-- command-waves:manifest:end -->";
const guardianWorkflowSignals = ["Command Waves Guardian", "npm run guardian:pr-check", "npm run guardian:verify-proof"];
const maxGitHubOwnerLength = 100;
const maxGitHubRepoLength = 100;
const githubOwnerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const githubRepoPattern = /^[A-Za-z0-9._-]+$/;

export function parseGitHubRepoUrl(value: string): GitHubRepoRef | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[?#].*)?$/);
  const match = sshMatch ?? urlMatch ?? shorthandMatch;

  if (!match) {
    return null;
  }

  const owner = match[1]!;
  const repo = match[2]!.replace(/\.git$/, "");

  if (
    !owner ||
    !repo ||
    owner.length > maxGitHubOwnerLength ||
    repo.length > maxGitHubRepoLength ||
    !githubOwnerPattern.test(owner) ||
    !githubRepoPattern.test(repo)
  ) {
    return null;
  }

  return {
    owner,
    repo,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}

export function commandBranchName(proposalId: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `command/${proposalId}${slug ? `-${slug}` : ""}`;
}

export function pullRequestUrl(repoUrl: string, prNumber: number) {
  const repo = parseGitHubRepoUrl(repoUrl);

  if (!repo) {
    return null;
  }

  return `${repo.htmlUrl}/pull/${prNumber}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function envValue(env: Record<string, string | undefined>, key: string) {
  return env[key]?.trim() || undefined;
}

function githubToken(options: GitHubRepoApiOptions) {
  const env = options.env ?? process.env;

  return options.token?.trim() || envValue(env, "COMMAND_WAVE_GITHUB_TOKEN") || envValue(env, "GITHUB_TOKEN");
}

function githubApiHeaders(options: GitHubRepoApiOptions = {}) {
  const token = githubToken(options);

  return {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function githubApiBaseUrl(options: GitHubRepoApiOptions) {
  return options.apiBaseUrl?.replace(/\/$/, "") ?? "https://api.github.com";
}

function repoApiPath(repo: GitHubRepoRef) {
  return `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
}

function repoContentUrl(repo: GitHubRepoRef, path: string, options: GitHubRepoApiOptions) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`${githubApiBaseUrl(options)}${repoApiPath(repo)}/contents/${encodedPath}`);
  const ref = options.ref?.trim();

  if (ref) {
    url.searchParams.set("ref", ref);
  }

  return url;
}

function repoRulesetsUrl(repo: GitHubRepoRef, options: GitHubRepoApiOptions) {
  return `${githubApiBaseUrl(options)}${repoApiPath(repo)}/rulesets`;
}

function repoBranchRulesUrl(repo: GitHubRepoRef, branch: string, options: GitHubRepoApiOptions) {
  const encodedBranch = encodeURIComponent(branch);

  return `${githubApiBaseUrl(options)}${repoApiPath(repo)}/rules/branches/${encodedBranch}`;
}

function decodeBase64(value: string) {
  return atob(value.replace(/\s+/g, ""));
}

function contentTextFromPayload(rawBody: string) {
  try {
    const payload = JSON.parse(rawBody) as unknown;

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const record = payload as Record<string, unknown>;
      const content = typeof record.content === "string" ? record.content : null;

      if (content && record.encoding === "base64") {
        return decodeBase64(content);
      }

      if (content) {
        return content;
      }
    }
  } catch {
    return rawBody;
  }

  return rawBody;
}

async function validateRequiredFile(file: (typeof requiredHookRepoFiles)[number], rawBody: string) {
  if (file.path !== ".github/PULL_REQUEST_TEMPLATE.md") {
    if (file.path === ".github/workflows/guardian-review.yml") {
      const content = contentTextFromPayload(rawBody);
      const hasGuardianSignals = guardianWorkflowSignals.every((signal) => content.includes(signal));

      return {
        valid: hasGuardianSignals,
        message: hasGuardianSignals
          ? `Found ${file.path} with guardian check and proof replay commands.`
          : `${file.path} is missing the guardian check or proof replay commands.`,
      };
    }

    return {
      valid: true,
      message: `Found ${file.path}.`,
    };
  }

  const content = contentTextFromPayload(rawBody);
  const hasManifestMarkers = content.includes(commandPrManifestStart) && content.includes(commandPrManifestEnd);

  return {
    valid: hasManifestMarkers,
    message: hasManifestMarkers
      ? `Found ${file.path} with Command Waves manifest markers.`
      : `${file.path} is missing Command Waves manifest markers.`,
  };
}

export async function getGitHubRepoMetadata(
  repoUrl: string,
  options: GitHubRepoApiOptions = {},
): Promise<GitHubRepoMetadata> {
  const repo = parseGitHubRepoUrl(repoUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!repo) {
    throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
  }

  const payload = asRecord(await fetchJsonWithTimeout<unknown>(`${githubApiBaseUrl(options)}${repoApiPath(repo)}`, {
    headers: githubApiHeaders(options),
    fetchImpl,
  }));

  return {
    ...repo,
    defaultBranch: typeof payload?.default_branch === "string" ? payload.default_branch : null,
    private: typeof payload?.private === "boolean" ? payload.private : null,
    archived: typeof payload?.archived === "boolean" ? payload.archived : null,
  };
}

export async function getGitHubRepoRequiredFiles(
  repoUrl: string,
  options: GitHubRepoApiOptions = {},
): Promise<GitHubRepoRequiredFile[]> {
  const repo = parseGitHubRepoUrl(repoUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!repo) {
    throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
  }

  return Promise.all(
    requiredHookRepoFiles.map(async (file) => {
      const response = await fetchTextResponseWithTimeout(repoContentUrl(repo, file.path, options), {
        allowedStatuses: [404],
        fetchImpl,
        headers: githubApiHeaders(options),
      });

      if (response.status === 404) {
        return {
          ...file,
          exists: false,
          valid: false,
          status: response.status,
          message: `Missing ${file.path}.`,
        };
      }

      const validation = await validateRequiredFile(file, response.text);

      return {
        ...file,
        exists: true,
        valid: validation.valid,
        status: response.status,
        message: validation.message,
      };
    }),
  );
}

export async function getGitHubRepoRequiredStatusChecks(repoUrl: string, options: GitHubRepoApiOptions = {}) {
  const repo = parseGitHubRepoUrl(repoUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!repo) {
    throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
  }

  const branch = options.ref?.trim() || "main";
  const [rulesetsPayload, branchRulesResponse] = await Promise.all([
    fetchJsonWithTimeout<unknown>(repoRulesetsUrl(repo, options), {
      headers: githubApiHeaders(options),
      fetchImpl,
    }),
    fetchTextResponseWithTimeout(repoBranchRulesUrl(repo, branch, options), {
      allowedStatuses: [404],
      headers: githubApiHeaders(options),
      fetchImpl,
    }),
  ]);
  const branchRulesPayload = branchRulesResponse.status === 404 ? null : JSON.parse(branchRulesResponse.text) as unknown;

  return extractRequiredStatusChecks([rulesetsPayload, branchRulesPayload]);
}
