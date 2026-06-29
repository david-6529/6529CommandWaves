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
] as const;

const commandPrManifestStart = "<!-- command-waves:manifest:start -->";
const commandPrManifestEnd = "<!-- command-waves:manifest:end -->";

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

  if (!owner || !repo) {
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

async function validateRequiredFile(file: (typeof requiredHookRepoFiles)[number], response: Response) {
  if (file.path !== ".github/PULL_REQUEST_TEMPLATE.md") {
    return {
      valid: true,
      message: `Found ${file.path}.`,
    };
  }

  const content = contentTextFromPayload(await response.text());
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

  const response = await fetchImpl(`${githubApiBaseUrl(options)}${repoApiPath(repo)}`, {
    headers: githubApiHeaders(options),
    cache: "no-store",
  });

  if (!response.ok) {
    throw Object.assign(new Error(`GitHub repo check failed: ${response.status} ${response.statusText}`), {
      status: response.status,
    });
  }

  const payload = asRecord(await response.json());

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
      const response = await fetchImpl(repoContentUrl(repo, file.path, options), {
        headers: githubApiHeaders(options),
        cache: "no-store",
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

      if (!response.ok) {
        throw Object.assign(new Error(`GitHub file check failed: ${response.status} ${response.statusText}`), {
          status: response.status,
        });
      }

      const validation = await validateRequiredFile(file, response);

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
