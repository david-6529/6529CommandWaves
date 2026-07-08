import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";
import { pollApprovalPassedForWave } from "./command-waves";
import { configuredGitHubRepo, gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { selectPhaseWork } from "./phase-work";

export type BuildTimelineStatus = "done" | "current" | "waiting" | "blocked";

export type BuildTimelineItem = {
  id: "proposal" | "decision" | "pr" | "review" | "next";
  label: string;
  title: string;
  detail: string;
  status: BuildTimelineStatus;
  href: string | null;
  hrefLabel: string | null;
};

function prUrl(execution: ExecutionRecord | null, repoUrl: string) {
  return execution ? (gitHubPullRequestUrlsForRepo(execution.artifacts, repoUrl)[0] ?? null) : null;
}

function proposalItem(proposal: CommandProposal | null): BuildTimelineItem {
  if (!proposal) {
    return {
      id: "proposal",
      label: "Proposal",
      title: "Choose one hook change",
      detail: "Start with one PR-sized change builders can discuss in chat.",
      status: "current",
      href: null,
      hrefLabel: null,
    };
  }

  return {
    id: "proposal",
    label: "Proposal",
    title: proposal.title,
    detail: `Proposed by ${proposal.proposer}.`,
    status: proposal.status === "rejected" ? "blocked" : "done",
    href: null,
    hrefLabel: null,
  };
}

function decisionItem(wave: CommandWave, proposal: CommandProposal | null, poll: PollState | null): BuildTimelineItem {
  if (!proposal) {
    return {
      id: "decision",
      label: "Decision",
      title: "Waiting for a proposal",
      detail: "A decision starts after builders have a scoped change.",
      status: "waiting",
      href: null,
      hrefLabel: null,
    };
  }

  if (proposal.status === "rejected" || poll?.status === "failed") {
    return {
      id: "decision",
      label: "Decision",
      title: "Decision needs attention",
      detail: "The current proposal did not pass.",
      status: "blocked",
      href: null,
      hrefLabel: null,
    };
  }

  if (pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true }) && poll?.decision) {
    return {
      id: "decision",
      label: "Decision",
      title: "Builders approved",
      detail: `Builders approved with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
      status: "done",
      href: poll.decision.url,
      hrefLabel: "Open decision",
    };
  }

  if (poll?.status === "passed") {
    return {
      id: "decision",
      label: "Decision",
      title: "Record the project decision",
      detail: "Add the decision URL before PR work starts.",
      status: "current",
      href: wave.waveUrl,
      hrefLabel: "Open chat",
    };
  }

  return {
    id: "decision",
    label: "Decision",
    title: "Ask builders to decide",
    detail: "Code work waits for a visible project decision.",
    status: "current",
    href: wave.waveUrl,
    hrefLabel: "Open chat",
  };
}

function prItem(
  wave: CommandWave,
  proposal: CommandProposal | null,
  poll: PollState | null,
  execution: ExecutionRecord | null,
): BuildTimelineItem {
  const decisionDone = pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true });
  const repo = configuredGitHubRepo(wave.repoUrl);
  const href = prUrl(execution, wave.repoUrl);

  if (!proposal || !decisionDone) {
    return {
      id: "pr",
      label: "PR",
      title: "Waiting for decision",
      detail: "The PR starts after approval is recorded.",
      status: "waiting",
      href: null,
      hrefLabel: null,
    };
  }

  if (!repo) {
    return {
      id: "pr",
      label: "PR",
      title: "GitHub repo placeholder",
      detail: "PR work waits while the GitHub repo is a placeholder.",
      status: "waiting",
      href: null,
      hrefLabel: null,
    };
  }

  if (execution?.status === "blocked") {
    return {
      id: "pr",
      label: "PR",
      title: "PR work is blocked",
      detail: execution.summary,
      status: "blocked",
      href,
      hrefLabel: href ? "Open PR" : null,
    };
  }

  if (execution?.status === "complete") {
    return href
      ? {
          id: "pr",
          label: "PR",
          title: "PR recorded",
          detail: "Approved PR record is ready for review.",
          status: "done",
          href,
          hrefLabel: "Open PR",
        }
      : {
          id: "pr",
          label: "PR",
          title: "PR link needed",
          detail: "Attach a PR from the selected GitHub repo.",
          status: "blocked",
          href: null,
          hrefLabel: null,
        };
  }

  return {
    id: "pr",
    label: "PR",
    title: "Build the approved PR",
    detail: "Use the approved packet and record the PR.",
    status: "current",
    href: repo.htmlUrl,
    hrefLabel: "Open repo",
  };
}

function reviewItem(execution: ExecutionRecord | null, review: GuardianReview | null): BuildTimelineItem {
  if (!execution || execution.status !== "complete") {
    return {
      id: "review",
      label: "Review",
      title: "Waiting for PR",
      detail: "Review starts after a PR is attached.",
      status: "waiting",
      href: null,
      hrefLabel: null,
    };
  }

  if (review?.status === "pass") {
    return {
      id: "review",
      label: "Review",
      title: "Review passed",
      detail: "Reviewer checked the PR against the approved hook proposal and rules.",
      status: "done",
      href: null,
      hrefLabel: null,
    };
  }

  if (review && review.status !== "waiting") {
    return {
      id: "review",
      label: "Review",
      title: "Review needs changes",
      detail: review.summary,
      status: "blocked",
      href: null,
      hrefLabel: null,
    };
  }

  return {
    id: "review",
    label: "Review",
    title: "Review the PR",
    detail: "Check the PR against the approved proposal and hook rules.",
    status: "current",
    href: null,
    hrefLabel: null,
  };
}

function nextItem(review: GuardianReview | null, draftTitle: string): BuildTimelineItem {
  if (review?.status === "pass") {
    return {
      id: "next",
      label: "Next",
      title: draftTitle.trim() || "Pick the next hook change",
      detail: "Bring the next small hook change to chat.",
      status: "current",
      href: null,
      hrefLabel: null,
    };
  }

  return {
    id: "next",
    label: "Next",
    title: "Next change waits",
    detail: "Finish this proposal, decision, PR, and review loop first.",
    status: "waiting",
    href: null,
    hrefLabel: null,
  };
}

export function createBuildTimeline(wave: CommandWave, draftTitle = ""): BuildTimelineItem[] {
  const phaseWork = selectPhaseWork(wave);

  return [
    proposalItem(phaseWork.prProposal),
    decisionItem(wave, phaseWork.prProposal, phaseWork.prPoll),
    prItem(wave, phaseWork.prProposal, phaseWork.prPoll, phaseWork.prExecution),
    reviewItem(phaseWork.prExecution, phaseWork.prReview),
    nextItem(phaseWork.prReview, draftTitle),
  ];
}
