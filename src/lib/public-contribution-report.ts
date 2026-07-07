import { orchestratorAgentIdentity, publicGithubRepoPlaceholder, reviewAgentIdentity } from "./agent-identities";
import type { CommandWave } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { isPlaceholderValue } from "./env-placeholders";
import { hashValue } from "./run-manifest";

export type PublicContributionReport = {
  version: "command-wave-contribution-report-v0.1";
  generatedAt: string;
  project: {
    id: string;
    name: string;
    waveUrl: string;
    repo: {
      status: "placeholder" | "configured";
      label: string;
      url: string | null;
    };
  };
  agents: {
    orchestrator: {
      handle: typeof orchestratorAgentIdentity.handle;
      status: typeof orchestratorAgentIdentity.status;
    };
    reviewer: {
      handle: typeof reviewAgentIdentity.handle;
      status: typeof reviewAgentIdentity.status;
    };
  };
  authority: {
    mode: "informational";
    sourceOfTruth: "project chat";
    doesNotGrant: string[];
    requiresHumanApproval: string[];
  };
  report: ContributionReport;
  reportHash: string;
};

type PublicContributionReportOptions = {
  generatedAt?: string;
  limit?: number;
};

function publicRepo(wave: CommandWave): PublicContributionReport["project"]["repo"] {
  const repoUrl = wave.repoUrl.trim();

  if (!repoUrl || isPlaceholderValue(repoUrl)) {
    return {
      status: "placeholder",
      label: publicGithubRepoPlaceholder.label,
      url: null,
    };
  }

  return {
    status: "configured",
    label: "GitHub repo configured",
    url: repoUrl,
  };
}

export function publicContributionReportHashInput(report: PublicContributionReport) {
  return Object.fromEntries(Object.entries(report).filter(([key]) => key !== "reportHash"));
}

export function createPublicContributionReport(
  wave: CommandWave,
  options: PublicContributionReportOptions = {},
): PublicContributionReport {
  const report = createContributionReport(wave, {
    generatedAt: options.generatedAt,
    limit: options.limit,
  });
  const generatedAt = options.generatedAt ?? report.generatedAt;
  const reportWithoutHash = {
    version: "command-wave-contribution-report-v0.1",
    generatedAt,
    project: {
      id: wave.id,
      name: wave.name,
      waveUrl: wave.waveUrl,
      repo: publicRepo(wave),
    },
    agents: {
      orchestrator: {
        handle: orchestratorAgentIdentity.handle,
        status: orchestratorAgentIdentity.status,
      },
      reviewer: {
        handle: reviewAgentIdentity.handle,
        status: reviewAgentIdentity.status,
      },
    },
    authority: {
      mode: "informational",
      sourceOfTruth: "project chat",
      doesNotGrant: ["Access", "Payouts", "Merge rights", "Reputation", "Token weight"],
      requiresHumanApproval: ["Access changes", "Merges", "Payments", "Governance changes"],
    },
    report,
  } satisfies Omit<PublicContributionReport, "reportHash">;

  return {
    ...reportWithoutHash,
    reportHash: hashValue(reportWithoutHash),
  };
}
