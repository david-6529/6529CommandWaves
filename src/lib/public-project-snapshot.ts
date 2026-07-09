import { pollApprovalPassedForWave, type CommandWave } from "./command-waves";
import { githubRepoPlaceholder, orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { ledgerEventsForVisibleProjectHistory } from "./ledger";
import { createParticipationAccessSnapshot } from "./participation-gates";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";
import { selectPhaseWork } from "./phase-work";

export type PublicProjectSnapshot = ReturnType<typeof createPublicProjectSnapshot>;

export const publicProjectChatSettings = {
  id: "project-chat",
  mode: "group_chat",
  label: "Group chat",
  title: "Group chat",
  detail:
    "Everyone writes in one shared chat. daemon watches the discussion and turns clear agreement into summaries, decisions, and PR-ready work.",
  composerLabel: "Message the group",
  placeholder: "Ask a question, suggest work, paste a PR, or share context.",
  posting: {
    label: "Posting pace",
    detail: "daemon can slow posting if chat gets noisy. Keep each message useful.",
  },
  parser: {
    agent: orchestratorAgentIdentity.handle,
    detail: "No need to choose a post type. daemon reads the stream and classifies what matters.",
  },
} as const;

export type PublicProjectChatSettings = typeof publicProjectChatSettings;

function eventTypeLabel(type: string) {
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
  const topics = [
    proposal
      ? {
          id: `proposal-${proposal.id}`,
          title: compactTopicTitle(proposal.title),
          detail: humanizeLegacyCommandCopy(proposal.prompt),
          status: isPlaceholderValue(wave.repoUrl) && proposal.kind === "open_pr" ? "repo not selected" : proposal.status.replaceAll("_", " "),
        }
      : null,
    isPlaceholderValue(wave.repoUrl)
      ? {
          id: "repo-selection",
          title: "Select the pilot GitHub repo",
          detail: "PR links and code review start after maintainers choose the repo.",
          status: "needed",
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
      })),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return topics.slice(0, 3);
}

function pullRequestSnapshots(wave: CommandWave) {
  if (isPlaceholderValue(wave.repoUrl)) {
    return [];
  }

  return wave.executions
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
      answer: "Connect wallet if you want, then request access in chat. A maintainer reviews it for this pilot.",
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
      label: eventTypeLabel(event.type),
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
