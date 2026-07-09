import type { CommandWave, ExecutionRecord, GuardianReview, LedgerEvent, PollState } from "./command-waves";
import { orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";
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
      title: "Decision recorded",
      body: `Approved the current hook change with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
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
    author: orchestratorAgentIdentity.handle,
    title: "Waiting for agreement",
    body: "I am watching for clear agreement before this becomes PR work.",
    status: "needs decision",
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
    author: orchestratorAgentIdentity.handle,
    title: label,
    body: "I recorded the PR for the approved hook change so builders can inspect it.",
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
    body: "Review checked the PR against the approved hook proposal and rules.",
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
      body: `I want to discuss ${draftTitle}. ${clean(draft?.prompt ?? "", "Can this be the next small hook change?")}`,
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
          author: orchestratorAgentIdentity.handle,
          title: "Waiting for builders",
          body: "Start with one small hook change. I will summarize agreement and keep the next step current.",
          status: "waiting",
        },
      ];
}
