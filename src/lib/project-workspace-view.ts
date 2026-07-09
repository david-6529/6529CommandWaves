import { githubRepoPlaceholder, reviewAgentIdentity } from "./agent-identities";
import { createBuilderRoster } from "./builder-roster";
import type { CommandProposal, CommandWave, RiskLevel } from "./command-waves";
import { createContributionReport } from "./contribution-report";
import { isPlaceholderValue } from "./env-placeholders";
import { parseGitHubRepoUrl } from "./github/repo";
import { ledgerEventsForVisibleProjectHistory } from "./ledger";
import {
  authorFromProjectChatObservation,
  messageFromProjectChatObservation,
  signalFromProjectChatObservation,
  type ProjectChatSignal,
} from "./project-chat-observation";
import { createPublicProjectSnapshot } from "./public-project-snapshot";

export type WorkspaceTone = "neutral" | "cyan" | "lime" | "amber" | "red";

export type WorkspaceWorkItem = {
  id: string;
  title: string;
  summary: string;
  stage: string;
  status: string;
  risk: RiskLevel | null;
  credits: string;
  roles: string[];
};

export type WorkspaceDiscussionMessage = {
  id: string;
  author: string;
  body: string;
  at: string;
  channel: "all" | "design" | "reviews";
};

export type ProjectWorkspaceView = {
  mode: "preview" | "live";
  eyebrow: string;
  projectName: string;
  tagline: string;
  statusLabel: string;
  waveUrl: string;
  repoUrl: string | null;
  stats: Array<{
    label: string;
    value: string;
    detail: string;
    tone: WorkspaceTone;
  }>;
  brief: {
    paragraphs: string[];
    rules: string[];
  };
  decision: {
    label: string;
    title: string;
    detail: string;
    status: string;
    href: string | null;
  } | null;
  milestone: {
    label: string;
    title: string;
    detail: string;
    completed: number;
    total: number;
  };
  workItems: WorkspaceWorkItem[];
  discussion: {
    summary: string;
    messages: WorkspaceDiscussionMessage[];
  };
  pullRequests: Array<{
    id: string;
    title: string;
    reason: string;
    url: string | null;
    daemonStatus: string;
    reviewerStatus: string;
  }>;
  contributors: Array<{
    identity: string;
    role: string;
    contribution: string;
    vote: string;
  }>;
  proof: {
    status: string;
    rules: string;
    events: string;
    reward: string;
  };
};

const previewRules = [
  "Up to 50 active builders. Reading stays public.",
  "High-risk hook work needs 50% quorum and at least 67% approval.",
  "Accepted work receives credits declared before builders claim it.",
  "Agents cannot vote, merge, deploy, finalize rewards, or move funds.",
] as const;

function projectName(value: string) {
  return value.trim().toLowerCase() === "6529 amm hook" ? "6529 AMM Hook" : value.trim() || "6529 AMM Hook";
}

function workspaceChannel(signal: ProjectChatSignal): WorkspaceDiscussionMessage["channel"] {
  if (signal === "pr_link" || signal === "review_request") {
    return "reviews";
  }

  if (signal === "decision_request" || signal === "suggested_work" || signal === "question") {
    return "design";
  }

  return "all";
}

function liveDiscussionMessages(wave: CommandWave): WorkspaceDiscussionMessage[] {
  return ledgerEventsForVisibleProjectHistory(wave.ledger, wave.repoUrl)
    .filter((event) => event.type === "chat_observed")
    .map((event) => {
      const signal = signalFromProjectChatObservation(event.message);

      return {
        id: event.id,
        author: authorFromProjectChatObservation(event.message),
        body: messageFromProjectChatObservation(event.message),
        at: event.at,
        channel: workspaceChannel(signal),
      };
    })
    .filter((message) => message.body.trim())
    .slice(0, 12)
    .reverse();
}

function proposalRoles(proposal: CommandProposal) {
  if (proposal.kind === "open_pr") {
    return ["Implementation", "Tests", "Review"];
  }

  if (proposal.kind === "read_context") {
    return ["Research", "Review"];
  }

  return ["Discussion", "Review"];
}

function liveWorkItems(wave: CommandWave): WorkspaceWorkItem[] {
  const items = wave.proposals.slice(0, 4).map((proposal) => ({
    id: proposal.id.toUpperCase(),
    title: proposal.title,
    summary: proposal.prompt,
    stage: proposal.kind === "open_pr" ? "Hook build" : "Project design",
    status: proposal.status.replaceAll("_", " "),
    risk: proposal.risk,
    credits: "Credits not live",
    roles: proposalRoles(proposal),
  }));

  if (items.length) {
    return items;
  }

  return previewWorkItems();
}

function previewWorkItems(): WorkspaceWorkItem[] {
  return [
    {
      id: "WORK 01",
      title: "Define immutable fee behavior",
      summary: "Agree on the fee logic, maximum bound, and the small set of parameters that may change.",
      stage: "Contract design",
      status: "Needs decision",
      risk: "high",
      credits: "Set before claim",
      roles: ["AMM design", "Security"],
    },
    {
      id: "WORK 02",
      title: "Connect the hook repository",
      summary: "Select the GitHub repo and install the required review check before code work begins.",
      stage: "Project setup",
      status: "Needs maintainer",
      risk: null,
      credits: "Setup work",
      roles: ["Maintainer"],
    },
    {
      id: "WORK 03",
      title: "Draft the hook scaffold",
      summary: "Create the non-upgradeable contract skeleton with explicit permission flags and bound-focused tests.",
      stage: "Hook build",
      status: "Waiting on repo",
      risk: "high",
      credits: "Set before claim",
      roles: ["Solidity", "Tests", "Review"],
    },
  ];
}

function previewBrief() {
  return [
    "This pilot will build a non-upgradeable Uniswap v4 hook with explicit fee bounds, strong tests, and human-controlled deployment.",
    "The repository, admission policy, contributor fee percentage, and independent reviewer are still being selected. Builder seats and rewards are not live yet.",
  ];
}

function currentMilestone(wave: CommandWave, repoUrl: string | null) {
  if (!repoUrl) {
    return {
      label: "Milestone 1 of 5",
      title: "Freeze the project rules",
      detail: "Approve the hook scope, admission policy, voting thresholds, and contributor fee before enrollment.",
      completed: 0,
      total: 5,
    };
  }

  if (!wave.executions.length) {
    return {
      label: "Milestone 2 of 5",
      title: "Build the first reviewed change",
      detail: "Move one approved work item into a GitHub pull request with tests and reviewer evidence.",
      completed: 1,
      total: 5,
    };
  }

  if (!wave.reviews.some((review) => review.status === "pass")) {
    return {
      label: "Milestone 3 of 5",
      title: "Complete independent review",
      detail: "Resolve review findings and bind the final result to the approved work and commit SHA.",
      completed: 2,
      total: 5,
    };
  }

  return {
    label: "Milestone 4 of 5",
    title: "Finalize contribution evidence",
    detail: "Review accepted work before contribution credits and fee shares can be finalized.",
    completed: 3,
    total: 5,
  };
}

function liveDecision(wave: CommandWave) {
  const snapshot = createPublicProjectSnapshot(wave);

  if (snapshot.currentDecisionRequest) {
    return {
      label: "Decision requested",
      title: snapshot.currentDecisionRequest.title,
      detail: snapshot.currentDecisionRequest.detail,
      status: snapshot.currentDecisionRequest.status,
      href: null,
    };
  }

  if (snapshot.currentVote.status === "open") {
    return {
      label: "Vote open",
      title: snapshot.currentVote.title,
      detail: snapshot.currentVote.detail,
      status: "Open",
      href: snapshot.currentVote.decisionUrl,
    };
  }

  return null;
}

export function createProjectWorkspaceView(
  wave: CommandWave,
  options: {
    previewMode?: boolean;
  } = {},
): ProjectWorkspaceView {
  const previewMode = options.previewMode ?? false;
  const snapshot = createPublicProjectSnapshot(wave);
  const parsedRepo = isPlaceholderValue(wave.repoUrl) ? null : parseGitHubRepoUrl(wave.repoUrl);
  const repoUrl = parsedRepo?.htmlUrl ?? null;
  const repositoryValue = parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : "Not connected";
  const discussionMessages = previewMode ? [] : liveDiscussionMessages(wave);
  const report = createContributionReport(wave);
  const contributors = previewMode
    ? []
    : createBuilderRoster(report, { limit: 6 }).map((member) => ({
        identity: member.identity,
        role: member.role,
        contribution: member.detail,
        vote: member.voteSummary,
      }));
  const briefParagraphs = previewMode ? previewBrief() : snapshot.summaryParagraphs;
  const pullRequests = previewMode
    ? []
    : snapshot.pullRequests.map((pullRequest) => ({
        id: pullRequest.id,
        title: pullRequest.title,
        reason: pullRequest.reason,
        url: pullRequest.url,
        daemonStatus: pullRequest.daemonSignoff,
        reviewerStatus: pullRequest.reviewerSignoff,
      }));

  return {
    mode: previewMode ? "preview" : "live",
    eyebrow: "Decentralized Coding / Beta",
    projectName: projectName(wave.name),
    tagline: "50 builders. One immutable hook. Fees shared by accepted contribution.",
    statusLabel: previewMode ? "Design preview" : "Active project",
    waveUrl: wave.waveUrl,
    repoUrl,
    stats: [
      {
        label: "Builders",
        value: "50 max",
        detail: "Enrollment not open",
        tone: "cyan",
      },
      {
        label: "Contributor share",
        value: "Needs approval",
        detail: "Fixed before enrollment",
        tone: "lime",
      },
      {
        label: "Repository",
        value: repositoryValue,
        detail: parsedRepo ? "GitHub connected" : githubRepoPlaceholder.nextStep,
        tone: parsedRepo ? "neutral" : "amber",
      },
      {
        label: "Reviewer",
        value: reviewAgentIdentity.status === "placeholder" ? "Not selected" : reviewAgentIdentity.handle,
        detail: "Humans control merge",
        tone: reviewAgentIdentity.status === "placeholder" ? "amber" : "neutral",
      },
    ],
    brief: {
      paragraphs: briefParagraphs,
      rules: [...previewRules],
    },
    decision: previewMode
      ? {
          label: "Before enrollment",
          title: "Approve the pilot rules",
          detail: "Set admission, high-risk voting, contributor fee percentage, and dispute authority.",
          status: "Needs decision",
          href: null,
        }
      : liveDecision(wave),
    milestone: currentMilestone(wave, repoUrl),
    workItems: previewMode ? previewWorkItems() : liveWorkItems(wave),
    discussion: {
      summary: discussionMessages.length
        ? `daemon has indexed ${discussionMessages.length} recent builder ${discussionMessages.length === 1 ? "message" : "messages"}.`
        : "daemon is waiting for the first live builder message.",
      messages: discussionMessages,
    },
    pullRequests,
    contributors,
    proof: {
      status: previewMode ? "Not live" : "Prototype evidence",
      rules: wave.rules.version,
      events: previewMode
        ? "No public event root"
        : `${wave.ledger.length} recorded ${wave.ledger.length === 1 ? "event" : "events"}`,
      reward: "Formula awaiting approval",
    },
  };
}
