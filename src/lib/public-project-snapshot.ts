import { classifyRisk, pollApprovalPassedForWave, type CommandWave, type RiskLevel } from "./command-waves";
import { githubRepoPlaceholder, orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";
import { directChatPostPace } from "./chat-posting-policy";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { ledgerEventsForVisibleProjectHistory } from "./ledger";
import { createParticipationAccessSnapshot } from "./participation-gates";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";
import { selectPhaseWork } from "./phase-work";
import {
  messageFromProjectChatObservation,
  projectChatObservationLabel,
  projectChatTopicStatus,
  signalFromProjectChatObservation,
} from "./project-chat-observation";

export type PublicProjectSnapshot = ReturnType<typeof createPublicProjectSnapshot>;

export const publicProjectChatSettings = {
  id: "project-chat",
  mode: "group_chat",
  label: "Group chat",
  title: "Live builder thread",
  detail:
    "One shared thread for questions, ideas, votes, and PR links. daemon parses messages in the background and keeps the project state current.",
  composerLabel: "Message",
  placeholder: "Ask a question, suggest work, paste a PR, or call for a vote.",
  posting: {
    label: `${directChatPostPace.maxPosts} messages / ${directChatPostPace.windowSeconds / 60} min`,
    detail: `Current daemon pace: ${directChatPostPace.maxPosts} messages every ${directChatPostPace.windowSeconds / 60} minutes per builder identity.`,
    pace: {
      maxPosts: directChatPostPace.maxPosts,
      windowSeconds: directChatPostPace.windowSeconds,
      identity: directChatPostPace.identity,
      enforcedBy: directChatPostPace.enforcedBy,
    },
  },
  parser: {
    agent: orchestratorAgentIdentity.handle,
    detail: "Write like a normal group chat. daemon reads the thread for work, votes, reviews, and PR links.",
  },
} as const;

export type PublicProjectChatSettings = typeof publicProjectChatSettings;

function eventTypeLabel(type: string, message = "") {
  if (type === "chat_observed") {
    return projectChatObservationLabel(message);
  }

  const labels: Record<string, string> = {
    wave_created: "project created",
    rules_defined: "setup updated",
    proposal_submitted: "work proposed",
    rule_check: "safety check",
    poll_opened: "decision opened",
    poll_passed: "builders approved",
    execution_started: "run started",
    execution_logged: "PR recorded",
    guardian_reviewed: "review recorded",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

function repoSnapshot(wave: CommandWave) {
  const repoUrl = wave.repoUrl.trim();

  if (!repoUrl || isPlaceholderValue(repoUrl)) {
    return {
      status: "placeholder",
      label: `${githubRepoPlaceholder.label}. ${githubRepoPlaceholder.description}`,
      url: null,
    };
  }

  return {
    status: "configured",
    label: "GitHub repo configured.",
    url: repoUrl,
  };
}

function currentWorkSnapshot(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal ?? phaseWork.supportProposals[0] ?? null;

  if (!proposal) {
    return {
      title: "Choose one hook change",
      status: "needs discussion",
      detail: "Start with one small hook change builders can discuss in chat.",
    };
  }

  return {
    title: humanizeLegacyCommandCopy(proposal.title),
    status: proposal.status.replaceAll("_", " "),
    detail: humanizeLegacyCommandCopy(proposal.prompt),
  };
}

function workflowStepLabel(id: ReturnType<typeof createPhaseChecklist>[number]["id"]) {
  const labels: Record<ReturnType<typeof createPhaseChecklist>[number]["id"], string> = {
    project: "Project",
    proposal: "Discuss",
    decision: "Decide",
    build: "PR",
    review: "Review",
    log: "Log",
  };

  return labels[id];
}

function workflowSnapshot(wave: CommandWave) {
  const checklist = createPhaseChecklist(wave);
  const nextAction = createPhaseNextAction(checklist);
  const currentStep =
    checklist.find((item) => item.status === "blocked" || item.status === "active") ??
    checklist.find((item) => item.status === "waiting") ??
    checklist[checklist.length - 1] ??
    null;

  return {
    current: {
      stepId: currentStep?.id ?? null,
      stepLabel: nextAction.stepLabel,
      status: nextAction.status,
      statusLabel: nextAction.statusLabel,
      title: nextAction.title,
      detail: nextAction.status === "ready" ? nextAction.detail : `${nextAction.stepLabel}: ${nextAction.detail}`,
    },
    steps: checklist.map((item) => ({
      id: item.id,
      label: workflowStepLabel(item.id),
      status: item.status,
      detail: item.detail,
    })),
  };
}

function compactTopicTitle(title: string) {
  const normalized = humanizeLegacyCommandCopy(title).trim();

  if (normalized === "Draft the non-upgradeable hook scaffold") {
    return "Draft hook scaffold";
  }

  return normalized;
}

function compactChatTopicTitle(message: string) {
  const normalized = humanizeLegacyCommandCopy(message)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^can we discuss\s+/i, "")
    .replace(/^can we\s+/i, "")
    .replace(/^should we\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();

  if (!normalized) {
    return "Recent chat";
  }

  const title = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return title.length > 58 ? `${title.slice(0, 55)}...` : title;
}

function chatMessageFromObservation(message: string) {
  return messageFromProjectChatObservation(humanizeLegacyCommandCopy(message));
}

function chatTopicRisk(message: string): RiskLevel | null {
  const signal = signalFromProjectChatObservation(message);

  if (!["pr_link", "decision_request", "review_request", "suggested_work"].includes(signal)) {
    return null;
  }

  return classifyRisk("open_pr", chatMessageFromObservation(message));
}

function githubPullRequestUrlFromText(value: string) {
  return (
    value.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?/i)?.[0] ??
    null
  );
}

function pullRequestNumberFromUrl(value: string) {
  return value.match(/\/pull\/(\d+)/i)?.[1] ?? null;
}

function currentVoteSnapshot(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal ?? phaseWork.supportProposals[0] ?? null;
  const poll = proposal
    ? proposal.kind === "open_pr"
      ? phaseWork.prPoll
      : (wave.polls.find((item) => item.proposalId === proposal.id) ?? null)
    : null;

  if (!poll) {
    return {
      status: "none",
      title: "No vote yet",
      detail: "Save a proposal from chat when the group is ready to decide.",
      proposalId: proposal?.id ?? null,
      yesVotes: 0,
      noVotes: 0,
      decisionUrl: null,
    };
  }

  if (poll.status === "open") {
    return {
      status: "open",
      title: "Vote open",
      detail: `${poll.yesVotes} yes, ${poll.noVotes} no. Builders can still vote.`,
      proposalId: poll.proposalId,
      yesVotes: poll.yesVotes,
      noVotes: poll.noVotes,
      decisionUrl: poll.decision?.url ?? null,
    };
  }

  if (poll.decision) {
    return {
      status: "recorded",
      title: "No open vote",
      detail: `Last decision: ${poll.yesVotes} yes, ${poll.noVotes} no.`,
      proposalId: poll.proposalId,
      yesVotes: poll.yesVotes,
      noVotes: poll.noVotes,
      decisionUrl: poll.decision.url,
    };
  }

  if (poll.status === "passed") {
    return {
      status: "decision link needed",
      title: "Decision link needed",
      detail: "Local vote passed. Record the project decision before PR work starts.",
      proposalId: poll.proposalId,
      yesVotes: poll.yesVotes,
      noVotes: poll.noVotes,
      decisionUrl: null,
    };
  }

  return {
    status: poll.status,
    title: poll.status === "failed" ? "Vote failed" : "Vote closed",
    detail: `${poll.yesVotes} yes, ${poll.noVotes} no.`,
    proposalId: poll.proposalId,
    yesVotes: poll.yesVotes,
    noVotes: poll.noVotes,
    decisionUrl: null,
  };
}

function decisionSnapshot(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const poll = phaseWork.prPoll;

  if (!proposal) {
    return {
      status: "waiting",
      detail: "Decision waits for a scoped PR-sized hook change.",
      url: null,
    };
  }

  if (poll?.decision && pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true })) {
    return {
      status: "recorded",
      detail: `Builders approved with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
      url: poll.decision.url,
    };
  }

  if (poll?.status === "passed") {
    return {
      status: "decision link needed",
      detail: "Local vote passed. Record the project decision link before PR work starts.",
      url: null,
    };
  }

  return {
    status: poll?.status ?? "not started",
    detail: "Discuss scope in chat before PR work starts.",
    url: null,
  };
}

function discussionTopicsSnapshot(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal ?? phaseWork.supportProposals[0] ?? null;
  const chatTopics = ledgerEventsForVisibleProjectHistory(wave.ledger, wave.repoUrl)
    .filter((event) => event.type === "chat_observed")
    .slice(0, 1)
    .map((event) => {
      const message = chatMessageFromObservation(event.message);

      return {
        id: `chat-${event.id}`,
        title: compactChatTopicTitle(message),
        detail: message || "Builders are discussing this in chat.",
        status: projectChatTopicStatus(event.message),
        risk: chatTopicRisk(event.message),
      };
    });
  const topics = [
    proposal
      ? {
          id: `proposal-${proposal.id}`,
          title: compactTopicTitle(proposal.title),
          detail: humanizeLegacyCommandCopy(proposal.prompt),
          status: isPlaceholderValue(wave.repoUrl) && proposal.kind === "open_pr" ? "repo not selected" : proposal.status.replaceAll("_", " "),
          risk: proposal.risk,
        }
      : null,
    ...chatTopics,
    isPlaceholderValue(wave.repoUrl)
      ? {
          id: "repo-selection",
          title: "Select the pilot GitHub repo",
          detail: "PR links and code review start after maintainers choose the repo.",
          status: "needed",
          risk: null,
        }
      : null,
    ...phaseWork.supportProposals
      .filter((item) => item.id !== proposal?.id)
      .slice(0, 3)
      .map((item) => ({
        id: `support-${item.id}`,
        title: humanizeLegacyCommandCopy(item.title),
        detail: humanizeLegacyCommandCopy(item.prompt),
        status: item.status.replaceAll("_", " "),
        risk: item.risk,
      })),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return topics.slice(0, 3);
}

function pullRequestSnapshots(wave: CommandWave) {
  if (isPlaceholderValue(wave.repoUrl)) {
    return [];
  }

  const executionRows = wave.executions
    .map((execution) => {
      const proposal = wave.proposals.find((item) => item.id === execution.proposalId);

      if (!proposal || proposal.kind !== "open_pr") {
        return null;
      }

      const review = wave.reviews.find((item) => item.proposalId === execution.proposalId) ?? null;
      const prUrl = gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl)[0] ?? null;
      const daemonSignoff =
        execution.status === "complete" ? "signed off" : execution.status === "blocked" ? "blocked" : "checking";
      const reviewProofBound = guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl);
      const reviewerSignoff =
        review?.status === "pass" && reviewProofBound
          ? reviewAgentIdentity.status === "placeholder"
            ? "proof recorded"
            : "signed off"
          : review?.status === "changes_requested"
            ? "changes requested"
            : review?.status === "rule_violation"
              ? "blocked"
              : "pending";

      return {
        id: execution.proposalId,
        title: compactTopicTitle(proposal.title),
        reason: humanizeLegacyCommandCopy(proposal.prompt),
        url: prUrl,
        daemonSignoff,
        reviewerSignoff,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const executionUrls = new Set(executionRows.map((row) => row.url).filter((url): url is string => Boolean(url)));
  const chatRows = ledgerEventsForVisibleProjectHistory(wave.ledger, wave.repoUrl)
    .filter((event) => event.type === "chat_observed")
    .map((event) => {
      const message = chatMessageFromObservation(event.message);
      const url = githubPullRequestUrlFromText(message);

      if (!url || executionUrls.has(url) || !gitHubPullRequestUrlsForRepo([url], wave.repoUrl).length) {
        return null;
      }

      const prNumber = pullRequestNumberFromUrl(url);

      return {
        id: `chat-pr-${event.id}`,
        title: prNumber ? `PR #${prNumber} discussed in chat` : "PR discussed in chat",
        reason: message,
        url,
        daemonSignoff: "needs decision",
        reviewerSignoff: "pending",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return [...executionRows, ...chatRows].slice(0, 6);
}

function projectRulesSnapshot(wave: CommandWave) {
  const access = createParticipationAccessSnapshot(wave.gates);
  const repoIsPlaceholder = isPlaceholderValue(wave.repoUrl);

  return [
    {
      question: "Who can join?",
      answer: access.summary,
    },
    {
      question: "How do I join?",
      answer: "Connect wallet if you want, then ask to join in chat. A maintainer reviews it for this pilot.",
    },
    {
      question: "How does work start?",
      answer: "Post in chat. daemon parses the discussion and turns clear agreement into small proposals.",
    },
    {
      question: "Who coordinates?",
      answer: `${orchestratorAgentIdentity.handle} updates the summary, labels risk, and routes work.`,
    },
    {
      question: "How are PRs approved?",
      answer: "Builders record a project decision before PR work starts. Reviewer status is shown on each PR.",
    },
    {
      question: "What about GitHub?",
      answer: repoIsPlaceholder
        ? "The GitHub repo is a placeholder. Chat can continue. PR work waits until maintainers choose the repo."
        : "PR work uses the selected GitHub repo. Each PR must link back to the approved work.",
    },
    {
      question: "Who reviews PRs?",
      answer: `${reviewAgentIdentity.role} is a placeholder for this phase. Humans still merge.`,
    },
    {
      question: "Who merges?",
      answer: "Humans merge, deploy, pay, and change rules. Agents summarize, draft, and check work.",
    },
  ];
}

function nextStepSnapshot(wave: CommandWave) {
  const checklist = createPhaseChecklist(wave);
  const item =
    checklist.find((entry) => entry.status === "blocked" || entry.status === "active") ??
    checklist.find((entry) => entry.status === "waiting") ??
    null;

  return item
    ? {
        label: item.label,
        status: item.status,
        detail: item.detail,
      }
    : {
        label: "Complete",
        status: "done",
        detail: "No open first-loop steps.",
      };
}

function projectSummary({
  currentWork,
  repo,
  nextStep,
  latestChange,
}: {
  currentWork: ReturnType<typeof currentWorkSnapshot>;
  repo: ReturnType<typeof repoSnapshot>;
  nextStep: ReturnType<typeof nextStepSnapshot>;
  latestChange: string | null;
}) {
  const repoLine =
    repo.status === "placeholder"
      ? "Repo: not selected."
      : "Repo: connected. Approved changes can enter PR review.";
  const nextStepDetail =
    repo.status === "placeholder" && nextStep.detail === "Select the hook repo before PR work starts."
      ? "Keep discussing in chat. Select the hook repo before PR work starts."
      : nextStep.detail;
  const statusParagraph = [
    `Now: ${currentWork.title}.`,
    `Next: ${nextStepDetail}`,
    repoLine,
    latestChange ? `Latest: ${latestChange}` : "Latest: no project changes recorded yet.",
  ].join(" ");

  return [
    "Builders coordinate this hook in chat. Decisions approve scoped work. GitHub PRs and human review handle code.",
    statusParagraph,
  ];
}

export function createPublicProjectSnapshot(wave: CommandWave) {
  const currentWork = currentWorkSnapshot(wave);
  const repo = repoSnapshot(wave);
  const nextStep = nextStepSnapshot(wave);
  const latestChanges = ledgerEventsForVisibleProjectHistory(wave.ledger, wave.repoUrl)
    .slice(0, 3)
    .map((event) => ({
      at: event.at,
      label: eventTypeLabel(event.type, event.message),
      message: humanizeLegacyCommandCopy(event.message),
    }));
  const summaryParagraphs = projectSummary({
    currentWork,
    repo,
    nextStep,
    latestChange: latestChanges[0]?.message ?? null,
  });

  return {
    summary: summaryParagraphs.join(" "),
    summaryParagraphs,
    updatedAt: latestChanges[0]?.at ?? null,
    managedBy: {
      summary: orchestratorAgentIdentity.handle,
      changelog: orchestratorAgentIdentity.handle,
      pullRequests: orchestratorAgentIdentity.handle,
      reviewer: reviewAgentIdentity.handle,
    },
    workflow: workflowSnapshot(wave),
    currentWork,
    currentVote: currentVoteSnapshot(wave),
    discussionTopics: discussionTopicsSnapshot(wave),
    chat: publicProjectChatSettings,
    pullRequests: pullRequestSnapshots(wave),
    rules: projectRulesSnapshot(wave),
    decision: decisionSnapshot(wave),
    repo,
    nextStep,
    latestChanges,
  };
}
