import type { CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";

export type PhaseChecklistStatus = "done" | "active" | "waiting" | "blocked";

export type PhaseChecklistItem = {
  id: "project" | "proposal" | "decision" | "build" | "review" | "log";
  label: string;
  status: PhaseChecklistStatus;
  detail: string;
};

function isDecisionDone(proposalStatus: string, poll: PollState | null) {
  return ["approved", "reviewing", "complete"].includes(proposalStatus) || poll?.status === "passed";
}

function setupCanRunCode(wave: CommandWave) {
  const waveText = wave.waveUrl.trim();
  const repoText = wave.repoUrl.trim();
  const repoLooksValid =
    /^git@github\.com:[^/\s]+\/[^/\s]+?(?:\.git)?$/.test(repoText) ||
    /^https?:\/\/github\.com\/[^/\s]+\/[^/\s?#]+(?:[?#].*)?$/.test(repoText) ||
    /^[^/\s]+\/[^/\s]+$/.test(repoText);

  return Boolean(waveText && repoLooksValid);
}

function latestExecution(wave: CommandWave) {
  const proposal = wave.proposals[0] ?? null;

  return proposal ? (wave.executions.find((item) => item.proposalId === proposal.id) ?? null) : null;
}

function latestReview(wave: CommandWave) {
  const proposal = wave.proposals[0] ?? null;

  return proposal ? (wave.reviews.find((item) => item.proposalId === proposal.id) ?? null) : null;
}

function buildStatus(execution: ExecutionRecord | null, decisionDone: boolean): Pick<PhaseChecklistItem, "status" | "detail"> {
  if (execution?.status === "complete") {
    return { status: "done", detail: "PR build evidence is recorded." };
  }

  if (execution?.status === "blocked") {
    return { status: "blocked", detail: "Build is blocked and needs attention." };
  }

  if (decisionDone) {
    return { status: "active", detail: "Approved work is ready for the PR build step." };
  }

  return { status: "waiting", detail: "Build waits for a passed decision." };
}

function reviewStatus(
  execution: ExecutionRecord | null,
  review: GuardianReview | null,
): Pick<PhaseChecklistItem, "status" | "detail"> {
  if (review?.status === "pass") {
    return { status: "done", detail: "Reviewer proof and checks are recorded." };
  }

  if (review && review.status !== "waiting") {
    return { status: "blocked", detail: `Review returned ${review.status.replaceAll("_", " ")}.` };
  }

  if (execution?.status === "complete") {
    return { status: "active", detail: "Execution evidence is ready for review." };
  }

  return { status: "waiting", detail: "Review waits for execution evidence." };
}

export function createPhaseChecklist(wave: CommandWave): PhaseChecklistItem[] {
  const canRunCode = setupCanRunCode(wave);
  const proposal = wave.proposals[0] ?? null;
  const poll = proposal ? (wave.polls.find((item) => item.proposalId === proposal.id) ?? null) : null;
  const execution = latestExecution(wave);
  const review = latestReview(wave);
  const decisionDone = proposal ? isDecisionDone(proposal.status, poll) : false;
  const build = buildStatus(execution, decisionDone);
  const reviewItem = reviewStatus(execution, review);
  const loggedReview = Boolean(
    proposal &&
      review?.status === "pass" &&
      wave.ledger.some(
        (event) =>
          event.type === "guardian_reviewed" && (event.message.includes(proposal.id) || wave.proposals.length === 1),
      ),
  );

  return [
    {
      id: "project",
      label: "Choose project",
      status: canRunCode ? "done" : "active",
      detail: canRunCode ? "Builder wave and GitHub repo are set." : "Set a valid builder wave and GitHub repo.",
    },
    {
      id: "proposal",
      label: "Propose work",
      status: proposal ? "done" : canRunCode ? "active" : "waiting",
      detail: proposal ? `${proposal.id}: ${proposal.title}` : "Write one PR-sized hook command.",
    },
    {
      id: "decision",
      label: "Decide",
      status: proposal
        ? proposal.status === "rejected" || poll?.status === "failed"
          ? "blocked"
          : decisionDone
            ? "done"
            : "active"
        : "waiting",
      detail: proposal
        ? poll
          ? `Vote is ${poll.status}: ${poll.yesVotes} yes, ${poll.noVotes} no.`
          : "No vote required by current rules."
        : "Decision waits for a proposal.",
    },
    {
      id: "build",
      label: "Build PR",
      status: build.status,
      detail: build.detail,
    },
    {
      id: "review",
      label: "Review",
      status: reviewItem.status,
      detail: reviewItem.detail,
    },
    {
      id: "log",
      label: "Log",
      status: loggedReview ? "done" : review?.status === "pass" ? "active" : "waiting",
      detail: loggedReview ? "Audit log and wave update draft are ready." : "Log the result before sharing it back.",
    },
  ];
}
