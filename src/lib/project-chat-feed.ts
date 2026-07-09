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
      label: "Decision",
      author: "builders",
      title: "Builders approved",
      body: `Builders approved with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
      status: `${poll.yesVotes} yes, ${poll.noVotes} no`,
      href: poll.decision.url,
      hrefLabel: "Open decision",
    };
  }

  return {
    id: "decision",
    label: "Decision",
    author: "builders",
    title: poll.status === "open" ? "Decision is open" : `Decision is ${poll.status}`,
    body: `Current tally is ${poll.yesVotes} yes and ${poll.noVotes} no.`,
    status: poll.status.replaceAll("_", " "),
  };
}

function draftDecisionItem(): ProjectChatFeedItem {
  return {
    id: "draft-decision",
    label: "Draft status",
    author: orchestratorAgentIdentity.handle,
    title: "Not decided yet",
    body: "Discuss this draft in chat before PR work starts.",
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
    label: supportProposalLabel(proposal),
    author: proposal.proposer,
    title: proposal.title,
    body: proposal.prompt,
    status: proposal.status.replaceAll("_", " "),
  };
}

function executionFeedItem(execution: ExecutionRecord | null, label = "PR"): ProjectChatFeedItem | null {
  if (!execution) {
    return null;
  }

  return {
    id: "pr",
    label,
    author: orchestratorAgentIdentity.handle,
    title: "PR recorded",
    body: "The approved hook change has a PR record ready for builders to inspect.",
    status: execution.status,
    href: prUrl(execution),
    hrefLabel: "Open PR",
  };
}

function reviewFeedItem(review: GuardianReview | null, label = "Review"): ProjectChatFeedItem | null {
  if (!review) {
    return null;
  }

  return {
    id: "review",
    label,
    author: reviewAgentIdentity.handle,
    title: review.status === "pass" ? "Review passed" : `Review is ${review.status.replaceAll("_", " ")}`,
    body: "The review checked the PR against the approved hook proposal and rules.",
    status: review.status.replaceAll("_", " "),
  };
}

function activityFeedItem(event: LedgerEvent): ProjectChatFeedItem {
  return {
    id: `activity-${event.id}`,
    label: "Activity",
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
      label: "Next proposal",
      author: clean(draft?.proposer ?? "", "A builder"),
      title: draftTitle,
      body: `${clean(draft?.proposer ?? "", "A builder")} is preparing this as the next PR-sized hook change for chat.`,
      status: "draft",
    });
    items.push(draftDecisionItem());
  } else if (phaseWork.prProposal) {
    items.push({
      id: "current-proposal",
      label: "Current proposal",
      author: phaseWork.prProposal.proposer,
      title: phaseWork.prProposal.title,
      body: phaseWork.prProposal.prompt,
      status: phaseWork.prProposal.status.replaceAll("_", " "),
    });
  } else {
    items.push(...phaseWork.supportProposals.slice(0, 2).map(supportProposalFeedItem));
  }

  const evidenceItems = isNextDraft
    ? [executionFeedItem(phaseWork.prExecution, "Last PR"), reviewFeedItem(phaseWork.prReview, "Last review")]
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
          label: "Start",
          author: orchestratorAgentIdentity.handle,
          title: "No hook activity yet",
          body: "Pick one small hook change and bring it to chat.",
          status: "waiting",
        },
      ];
}
