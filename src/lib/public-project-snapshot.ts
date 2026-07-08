import { pollApprovalPassedForWave, type CommandWave } from "./command-waves";
import { githubRepoPlaceholder } from "./agent-identities";
import { isPlaceholderValue } from "./env-placeholders";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { ledgerEventsByRecency } from "./ledger";
import { createPhaseChecklist } from "./phase-checklist";
import { selectPhaseWork } from "./phase-work";

export type PublicProjectSnapshot = ReturnType<typeof createPublicProjectSnapshot>;

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
      ? "GitHub repo is intentionally a placeholder until PR work starts."
      : "Repo is connected. Approved changes can move into PR review.";
  const statusParagraph = [
    `Current focus: ${currentWork.title}.`,
    `Next: ${nextStep.detail}`,
    repoLine,
    latestChange ? `Latest change: ${latestChange}` : "No project changes recorded yet.",
  ].join(" ");

  return [
    "This pilot is the shared workspace for the 6529 AMM hook. Builders use chat to ask questions, suggest work, record decisions, and prepare approved changes for GitHub PRs.",
    statusParagraph,
  ];
}

export function createPublicProjectSnapshot(wave: CommandWave) {
  const currentWork = currentWorkSnapshot(wave);
  const repo = repoSnapshot(wave);
  const nextStep = nextStepSnapshot(wave);
  const latestChanges = ledgerEventsByRecency(wave.ledger)
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
    currentWork,
    decision: decisionSnapshot(wave),
    repo,
    nextStep,
    latestChanges,
  };
}
