import { githubRepoPlaceholder, reviewAgentIdentity } from "./agent-identities";
import { createBuilderRoster } from "./builder-roster";
import { pollApprovalPassedForWave, type CommandProposal, type CommandWave, type RiskLevel } from "./command-waves";
import { createContributionReport } from "./contribution-report";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { parseGitHubRepoUrl } from "./github/repo";
import { ledgerEventsForVisibleProjectHistory } from "./ledger";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import {
  authorFromProjectChatObservation,
  messageFromProjectChatObservation,
  signalFromProjectChatObservation,
  type ProjectChatSignal,
} from "./project-chat-observation";
import { createPublicProjectSnapshot } from "./public-project-snapshot";
import { siteCopy } from "./site-copy";

export type WorkspaceTone = "neutral" | "cyan" | "lime" | "amber" | "red";

export type WorkspaceWorkItem = {
  id: string;
  displayId: string;
  href: string;
  title: string;
  summary: string;
  stage: string;
  status: string;
  risk: RiskLevel | null;
  roles: string[];
  deliverables: string[];
  constraints: string[];
  reward: {
    status: string;
    detail: string;
  };
  decision: {
    status: string;
    detail: string;
    href: string | null;
  };
  code: {
    status: string;
    detail: string;
    repoUrl: string | null;
    pullRequestUrl: string | null;
    daemonStatus: string;
    reviewerStatus: string;
  };
  evidence: Array<{
    label: string;
    value: string;
    href: string | null;
  }>;
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
  const name = value.trim().toLowerCase() === "6529 amm hook" ? "6529 AMM Hook" : value.trim() || "6529 AMM Hook";

  return siteCopy(name);
}

function workspaceCopy(value: string) {
  return siteCopy(humanizeLegacyCommandCopy(value));
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
        author: siteCopy(authorFromProjectChatObservation(event.message)),
        body: siteCopy(messageFromProjectChatObservation(event.message)),
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

function unavailableReward() {
  return {
    status: "Not claimable",
    detail: "Signed membership and approved task credits are not live. No fee share can be earned or finalized for this work yet.",
  };
}

function proposalDecision(wave: CommandWave, proposal: CommandProposal): WorkspaceWorkItem["decision"] {
  const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;

  if (!poll) {
    const rule = wave.rules.rulesByKind[proposal.kind];

    if (rule.mode === "auto") {
      return {
        status: "No vote required",
        detail: rule.reason,
        href: null,
      };
    }

    return {
      status: "Not started",
      detail: "No group vote has been recorded for this work.",
      href: null,
    };
  }

  if (poll.status === "open") {
    return {
      status: "Vote open",
      detail: `${poll.yesVotes} yes and ${poll.noVotes} no. Approval needs ${poll.quorumRequired} voters and ${poll.yesPercentRequired}% yes.`,
      href: poll.decision?.url ?? null,
    };
  }

  if (pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true })) {
    return {
      status: "Recorded",
      detail: `Builders approved this work with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
      href: poll.decision?.url ?? null,
    };
  }

  if (poll.status === "passed") {
    return {
      status: "Decision link needed",
      detail: `The local vote passed with ${poll.yesVotes} yes and ${poll.noVotes} no, but no valid project decision link is recorded.`,
      href: null,
    };
  }

  if (poll.status === "not_required") {
    return {
      status: "No vote required",
      detail: wave.rules.rulesByKind[proposal.kind].reason,
      href: poll.decision?.url ?? null,
    };
  }

  return {
    status: poll.status === "failed" ? "Vote failed" : "Vote closed",
    detail: `${poll.yesVotes} yes and ${poll.noVotes} no.`,
    href: poll.decision?.url ?? null,
  };
}

function proposalCode(wave: CommandWave, proposal: CommandProposal): WorkspaceWorkItem["code"] {
  const repo = isPlaceholderValue(wave.repoUrl) ? null : parseGitHubRepoUrl(wave.repoUrl);
  const execution = wave.executions.find((item) => item.proposalId === proposal.id) ?? null;
  const review = wave.reviews.find((item) => item.proposalId === proposal.id) ?? null;
  const pullRequestUrl = execution
    ? (gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl)[0] ?? null)
    : null;
  const proofBound = guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl);
  const reviewerStatus =
    review?.status === "pass" && proofBound
      ? "Proof recorded"
      : review?.status === "changes_requested"
        ? "Changes requested"
        : review?.status === "rule_violation"
          ? "Blocked"
          : "Pending";
  const daemonStatus =
    execution?.status === "complete"
      ? "Signed off"
      : execution?.status === "blocked"
        ? "Blocked"
        : execution
          ? "Checking"
          : "Waiting";

  if (!repo) {
    return {
      status: "Blocked",
      detail: "Select the project repository before PR work starts.",
      repoUrl: null,
      pullRequestUrl: null,
      daemonStatus: "Waiting",
      reviewerStatus: "Pending",
    };
  }

  if (!execution) {
    return {
      status: "Not started",
      detail: "No execution or pull request has been recorded for this work.",
      repoUrl: repo.htmlUrl,
      pullRequestUrl: null,
      daemonStatus,
      reviewerStatus,
    };
  }

  return {
    status: pullRequestUrl ? "PR recorded" : execution.status.replaceAll("_", " "),
    detail: workspaceCopy(execution.summary),
    repoUrl: repo.htmlUrl,
    pullRequestUrl,
    daemonStatus,
    reviewerStatus,
  };
}

function proposalEvidence(wave: CommandWave, proposal: CommandProposal): WorkspaceWorkItem["evidence"] {
  const poll = wave.polls.find((item) => item.proposalId === proposal.id) ?? null;
  const execution = wave.executions.find((item) => item.proposalId === proposal.id) ?? null;
  const review = wave.reviews.find((item) => item.proposalId === proposal.id) ?? null;
  const pullRequestUrl = execution
    ? (gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl)[0] ?? null)
    : null;
  const proofBound = guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl);
  const pullRequestNumber = pullRequestUrl?.match(/\/pull\/(\d+)/)?.[1] ?? null;
  const decisionRecorded = pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true });

  return [
    decisionRecorded && poll?.decision?.url
      ? {
          label: "Group decision",
          value: `${poll.yesVotes} yes, ${poll.noVotes} no`,
          href: poll.decision.url,
        }
      : null,
    pullRequestUrl
      ? {
          label: "Pull request",
          value: pullRequestNumber ? `PR #${pullRequestNumber}` : "GitHub PR",
          href: pullRequestUrl,
        }
      : null,
    review?.proof && proofBound
      ? {
          label: "Reviewer attestation",
          value: review.proof.attestationHash,
          href: null,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function liveWorkItems(wave: CommandWave): WorkspaceWorkItem[] {
  const items = wave.proposals.slice(0, 4).map((proposal) => {
    const id = proposal.id.toLowerCase();

    return {
      id,
      displayId: proposal.id.toUpperCase(),
      href: `/work/${encodeURIComponent(id)}`,
      title: workspaceCopy(proposal.title),
      summary: workspaceCopy(proposal.prompt),
      stage: proposal.kind === "open_pr" ? "Hook build" : "Project design",
      status:
        proposal.kind === "open_pr" && isPlaceholderValue(wave.repoUrl)
          ? "Waiting on repo"
          : proposal.status.replaceAll("_", " "),
      risk: proposal.risk,
      roles: proposalRoles(proposal),
      deliverables: [workspaceCopy(proposal.prompt)],
      constraints: [
        workspaceCopy(proposal.spec) ||
          "Work must stay inside the approved proposal and current project rules.",
      ],
      reward: unavailableReward(),
      decision: proposalDecision(wave, proposal),
      code: proposalCode(wave, proposal),
      evidence: proposalEvidence(wave, proposal),
    };
  });

  if (items.length) {
    return items;
  }

  return previewWorkItems();
}

function previewWorkItems(): WorkspaceWorkItem[] {
  return [
    {
      id: "work-01",
      displayId: "WORK 01",
      href: "/work/work-01",
      title: "Define immutable fee behavior",
      summary: "Agree on the fee logic, maximum bound, and the small set of parameters that may change.",
      stage: "Contract design",
      status: "Needs decision",
      risk: "high",
      roles: ["AMM design", "Security"],
      deliverables: [
        "An approved fee rule with a hard maximum bound.",
        "The exact parameters that may change after deployment.",
        "A short security rationale for each adjustable parameter.",
      ],
      constraints: [
        "No proxy or delegatecall upgrade path.",
        "No autonomous parameter changes.",
        "No fee value is treated as final before the group approves it.",
      ],
      reward: unavailableReward(),
      decision: {
        status: "Needs group decision",
        detail: "Builders must approve the fee logic, hard cap, and every parameter that may change.",
        href: null,
      },
      code: {
        status: "Not started",
        detail: "Design comes first. No contract change or pull request is recorded.",
        repoUrl: null,
        pullRequestUrl: null,
        daemonStatus: "Waiting",
        reviewerStatus: "Pending",
      },
      evidence: [],
    },
    {
      id: "work-02",
      displayId: "WORK 02",
      href: "/work/work-02",
      title: "Connect the hook repository",
      summary: "Select the GitHub repo and install the required review check before code work begins.",
      stage: "Project setup",
      status: "Needs maintainer",
      risk: null,
      roles: ["Maintainer"],
      deliverables: [
        "A selected public GitHub repository.",
        "Contribution guidance and a pull request template.",
        "A required review check in the merge path.",
      ],
      constraints: [
        "A placeholder URL cannot be presented as the project repo.",
        "Code work remains blocked until the selected repo is connected.",
      ],
      reward: unavailableReward(),
      decision: {
        status: "Needs maintainer",
        detail: "Maintainers must select the repository and approve the required review path.",
        href: null,
      },
      code: {
        status: "Not connected",
        detail: "No project repository has been selected.",
        repoUrl: null,
        pullRequestUrl: null,
        daemonStatus: "Waiting",
        reviewerStatus: "Pending",
      },
      evidence: [],
    },
    {
      id: "work-03",
      displayId: "WORK 03",
      href: "/work/work-03",
      title: "Draft the hook scaffold",
      summary: "Create the non-upgradeable contract skeleton with explicit permission flags and bound-focused tests.",
      stage: "Hook build",
      status: "Waiting on repo",
      risk: "high",
      roles: ["Solidity", "Tests", "Review"],
      deliverables: [
        "A minimal non-upgradeable hook contract.",
        "Explicit Uniswap v4 hook permission flags.",
        "Tests for every approved fee and parameter bound.",
      ],
      constraints: [
        "Wait for approved fee behavior and a connected repository.",
        "No deploy script, payment logic, or governance change.",
      ],
      reward: unavailableReward(),
      decision: {
        status: "Blocked",
        detail: "This waits for approved fee behavior and a connected repository.",
        href: null,
      },
      code: {
        status: "Blocked",
        detail: "No repository or approved contract design is ready for implementation.",
        repoUrl: null,
        pullRequestUrl: null,
        daemonStatus: "Waiting",
        reviewerStatus: "Pending",
      },
      evidence: [],
    },
  ];
}

export function findWorkspaceWorkItem(view: ProjectWorkspaceView, id: string) {
  const normalizedId = id.trim().toLowerCase();

  return view.workItems.find((item) => item.id.toLowerCase() === normalizedId) ?? null;
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
      title: siteCopy(snapshot.currentDecisionRequest.title),
      detail: siteCopy(snapshot.currentDecisionRequest.detail),
      status: siteCopy(snapshot.currentDecisionRequest.status),
      href: null,
    };
  }

  if (snapshot.currentVote.status === "open") {
    return {
      label: "Vote open",
      title: siteCopy(snapshot.currentVote.title),
      detail: siteCopy(snapshot.currentVote.detail),
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
        identity: siteCopy(member.identity),
        role: siteCopy(member.role),
        contribution: siteCopy(member.detail),
        vote: siteCopy(member.voteSummary),
      }));
  const briefParagraphs = previewMode ? previewBrief() : snapshot.summaryParagraphs.map(siteCopy);
  const pullRequests = previewMode
    ? []
    : snapshot.pullRequests.map((pullRequest) => ({
        id: pullRequest.id,
        title: siteCopy(pullRequest.title),
        reason: siteCopy(pullRequest.reason),
        url: pullRequest.url,
        daemonStatus: siteCopy(pullRequest.daemonSignoff),
        reviewerStatus: siteCopy(pullRequest.reviewerSignoff),
      }));

  return {
    mode: previewMode ? "preview" : "live",
    eyebrow: "Decentralized Coding: Beta",
    projectName: `Pilot: ${projectName(wave.name)}`,
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
