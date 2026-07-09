import type { CommandWave, ExecutionRecord, GuardianReview, LedgerEvent, PollState } from "./command-waves";
import { reviewAgentIdentity } from "./agent-identities";
import { commandKindLabel } from "./command-kind-copy";
import { ledgerEventsByRecency } from "./ledger";
import { selectPhaseWork } from "./phase-work";

export type ProjectChatFeedDraft = {
  title: string;
  prompt: string;
  proposer: string;
};

export type ProjectChatFeedItem = {
  id: string;
  label: string;
  author?: string;
  title: string;
  body: string;
  status: string;
  href?: string | null;
  hrefLabel?: string;
};

function clean(value: string, fallback: string) {
  return value.trim() || fallback;
}

function prUrl(execution: ExecutionRecord | null) {
  return (
    execution?.artifacts.find((artifact) =>
      /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?$/.test(artifact),
    ) ?? null
  );
}

function decisionFeedItem(poll: PollState | null): ProjectChatFeedItem | null {
  if (!poll) {
    return null;
  }

  if (poll.decision) {
    return {
      id: "decision",
      label: "message",
      author: "builders",
      title: "Decision linked",
      body: `The hook scaffold vote passed with ${poll.yesVotes} yes and ${poll.noVotes} no. This is the scope PRs should follow.`,
      status: `${poll.yesVotes} yes, ${poll.noVotes} no`,
      href: poll.decision.url,
      hrefLabel: "Open decision",
    };
  }

  return {
    id: "decision",
    label: "message",
    author: "builders",
    title: poll.status === "open" ? "Decision is open" : `Decision is ${poll.status}`,
    body: `Current vote is ${poll.yesVotes} yes and ${poll.noVotes} no.`,
    status: poll.status.replaceAll("_", " "),
  };
}

function draftDecisionItem(): ProjectChatFeedItem {
  return {
    id: "draft-decision",
    label: "message",
    author: "gpebbles",
    title: "Scope check",
    body: "This seems small enough for the next step if it only adds tests and does not change deployment or ownership.",
    status: "needs decision",
  };
}

function builderScopeItem(): ProjectChatFeedItem {
  return {
    id: "scope-check",
    label: "message",
    author: "gpebbles",
    title: "Scope check",
    body: "Let's keep this to the non-upgradeable scaffold, fee cap, and tests. No deploy or ownership change.",
    status: "scope",
  };
}

function repoNextItem(): ProjectChatFeedItem {
  return {
    id: "repo-next",
    label: "message",
    author: "simo",
    title: "Repo next",
    body: "PR work can start once maintainers select the pilot GitHub repo.",
    status: "repo needed",
  };
}

function builderRiskItem(): ProjectChatFeedItem {
  return {
    id: "risk-note",
    label: "message",
    author: "zoku",
    title: "Risk note",
    body: "Because this touches hook code, let's keep bounds and tests explicit before PR work starts.",
    status: "needs care",
  };
}

function supportProposalLabel(proposal: CommandWave["proposals"][number]) {
  if (proposal.kind === "draft_response") {
    return "Question";
  }

  if (proposal.kind === "post_to_wave") {
    return "Update";
  }

  if (proposal.kind === "read_context") {
    return "Context";
  }

  return commandKindLabel(proposal.kind);
}

function supportProposalFeedItem(proposal: CommandWave["proposals"][number]): ProjectChatFeedItem {
  return {
    id: `support-${proposal.id}`,
    label: "message",
    author: proposal.proposer,
    title: supportProposalLabel(proposal),
    body: `${proposal.title}: ${proposal.prompt}`,
    status: proposal.status.replaceAll("_", " "),
  };
}

function executionFeedItem(execution: ExecutionRecord | null, label = "PR"): ProjectChatFeedItem | null {
  if (!execution) {
    return null;
  }

  return {
    id: "pr",
    label: "message",
    author: "david",
    title: label,
    body: "I linked the PR for the approved hook change so everyone can inspect the code and tests.",
    status: execution.status,
    href: prUrl(execution),
    hrefLabel: "Open PR",
  };
}

function reviewFeedItem(review: GuardianReview | null): ProjectChatFeedItem | null {
  if (!review) {
    return null;
  }

  return {
    id: "review",
    label: "message",
    author: reviewAgentIdentity.handle,
    title: review.status === "pass" ? "Review passed" : `Review is ${review.status.replaceAll("_", " ")}`,
    body: "Reviewer check matched the PR to the approved hook scope and project rules.",
    status: review.status.replaceAll("_", " "),
  };
}

function activityFeedItem(event: LedgerEvent): ProjectChatFeedItem {
  return {
    id: `activity-${event.id}`,
    label: "message",
    author: event.actor,
    title: event.type.replaceAll("_", " "),
    body: event.message,
    status: event.actor,
  };
}

export function createProjectChatFeed(wave: CommandWave, draft?: ProjectChatFeedDraft): ProjectChatFeedItem[] {
  const phaseWork = selectPhaseWork(wave);
  const items: ProjectChatFeedItem[] = [];
  const draftTitle = clean(draft?.title ?? "", "");
  const isNextDraft = phaseWork.prReview?.status === "pass" && Boolean(draftTitle);

  if (isNextDraft) {
    items.push({
      id: "next-proposal",
      label: "message",
      author: clean(draft?.proposer ?? "", "A builder"),
      title: "Suggested work",
      body: `Can we discuss ${draftTitle}? ${clean(draft?.prompt ?? "", "Can this be the next small hook change?")}`,
      status: "draft",
    });
    items.push(draftDecisionItem());
  } else if (phaseWork.prProposal) {
    items.push({
      id: "current-proposal",
      label: "message",
      author: phaseWork.prProposal.proposer,
      title: "Suggested work",
      body: `I think the next hook change should be ${phaseWork.prProposal.title}. ${phaseWork.prProposal.prompt}`,
      status: phaseWork.prProposal.status.replaceAll("_", " "),
    });
    items.push(builderScopeItem());
  } else {
    items.push(...phaseWork.supportProposals.slice(0, 2).map(supportProposalFeedItem));
  }

  const evidenceItems = isNextDraft
    ? [executionFeedItem(phaseWork.prExecution, "Last PR"), reviewFeedItem(phaseWork.prReview)]
    : [decisionFeedItem(phaseWork.prPoll), executionFeedItem(phaseWork.prExecution), reviewFeedItem(phaseWork.prReview)];

  for (const item of evidenceItems) {
    if (item) {
      items.push(item);
    }
  }

  if (phaseWork.prProposal && !phaseWork.prExecution && items.length < 4) {
    items.push(repoNextItem());
  }

  if (phaseWork.prProposal && !phaseWork.prExecution && items.length < 4) {
    items.push(builderRiskItem());
  }

  for (const event of ledgerEventsByRecency(wave.ledger)) {
    if (items.length >= 4) {
      break;
    }

    items.push(activityFeedItem(event));
  }

  return items.length
    ? items.slice(0, 4)
    : [
        {
          id: "start",
          label: "message",
          author: "builders",
          title: "Start the thread",
          body: "Drop the first small hook change here. daemon will summarize agreement and keep the next step current.",
          status: "waiting",
        },
      ];
}
