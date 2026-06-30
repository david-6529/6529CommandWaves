import type { CommandWave, ExecutionRecord, GuardianReview, LedgerEvent, PollState } from "./command-waves";
import { ledgerEventsByRecency } from "./ledger";
import { selectPhaseWork } from "./phase-work";

export type RoomFeedDraft = {
  title: string;
  prompt: string;
  proposer: string;
};

export type RoomFeedItem = {
  id: string;
  label: string;
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

function decisionFeedItem(poll: PollState | null): RoomFeedItem | null {
  if (!poll) {
    return null;
  }

  if (poll.decision) {
    return {
      id: "decision",
      label: "Decision",
      title: "6529 decision recorded",
      body: `The 6529 decision recorded ${poll.yesVotes} yes and ${poll.noVotes} no.`,
      status: `${poll.yesVotes} yes, ${poll.noVotes} no`,
      href: poll.decision.url,
      hrefLabel: "Open decision",
    };
  }

  return {
    id: "decision",
    label: "Decision",
    title: poll.status === "open" ? "Decision is open" : `Decision is ${poll.status}`,
    body: `Current tally is ${poll.yesVotes} yes and ${poll.noVotes} no.`,
    status: poll.status.replaceAll("_", " "),
  };
}

function draftDecisionItem(): RoomFeedItem {
  return {
    id: "draft-decision",
    label: "Draft status",
    title: "Not decided yet",
    body: "Discuss this draft in the room before PR work starts.",
    status: "needs decision",
  };
}

function executionFeedItem(execution: ExecutionRecord | null, label = "PR"): RoomFeedItem | null {
  if (!execution) {
    return null;
  }

  return {
    id: "pr",
    label,
    title: "PR evidence recorded",
    body: "The approved hook change has a PR record ready for builders to inspect.",
    status: execution.status,
    href: prUrl(execution),
    hrefLabel: "Open PR",
  };
}

function reviewFeedItem(review: GuardianReview | null, label = "Review"): RoomFeedItem | null {
  if (!review) {
    return null;
  }

  return {
    id: "review",
    label,
    title: review.status === "pass" ? "Review passed" : `Review is ${review.status.replaceAll("_", " ")}`,
    body: "The review checked the PR against the approved hook proposal and rules.",
    status: review.status.replaceAll("_", " "),
  };
}

function activityFeedItem(event: LedgerEvent): RoomFeedItem {
  return {
    id: `activity-${event.id}`,
    label: "Activity",
    title: event.type.replaceAll("_", " "),
    body: event.message,
    status: event.actor,
  };
}

export function createRoomFeed(wave: CommandWave, draft?: RoomFeedDraft): RoomFeedItem[] {
  const phaseWork = selectPhaseWork(wave);
  const items: RoomFeedItem[] = [];
  const draftTitle = clean(draft?.title ?? "", "");
  const isNextDraft = phaseWork.prReview?.status === "pass" && Boolean(draftTitle);

  if (isNextDraft) {
    items.push({
      id: "next-proposal",
      label: "Next proposal",
      title: draftTitle,
      body: `${clean(draft?.proposer ?? "", "A builder")} is preparing this as the next PR-sized hook change for the room.`,
      status: "draft",
    });
    items.push(draftDecisionItem());
  } else if (phaseWork.prProposal) {
    items.push({
      id: "current-proposal",
      label: "Current proposal",
      title: phaseWork.prProposal.title,
      body: phaseWork.prProposal.prompt,
      status: phaseWork.prProposal.status.replaceAll("_", " "),
    });
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
          title: "No hook activity yet",
          body: "Pick one small hook change and bring it to the room.",
          status: "waiting",
        },
      ];
}
