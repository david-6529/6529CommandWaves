import type { CommandWave } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { ledgerEventsByRecency } from "./ledger";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction, type PhaseNextActionStatus } from "./phase-next-action";
import { selectPhaseWork } from "./phase-work";

export type ActiveHookProject = {
  id: string;
  name: string;
  status: "active" | "setup";
  statusLabel: string;
  waveUrl: string;
  repoUrl: string;
  waveLabel: string;
  repoLabel: string;
  currentFocus: string;
  participation: string;
  waveRole: string;
  platformRole: string;
  gateDetails: string[];
  gateSnapshotLabel: string;
  orchestrationSnapshotLabel: string;
  codeSnapshotLabel: string;
  nextActionStatus: PhaseNextActionStatus;
  nextActionLabel: string;
  nextActionTitle: string;
  nextActionDetail: string;
  waveStatus: string;
  codeStatus: string;
  latestPrUrl: string | null;
  reviewStatusLabel: string;
  evidenceLabel: string;
  latestActivity: string;
};

function hookName(wave: CommandWave) {
  if (/6529[-\s]?hook/i.test(`${wave.name} ${wave.repoUrl}`)) {
    return "Hook Build";
  }

  return wave.name.replace(/\b(builder|wave|command)\b/gi, "").replace(/\s+/g, " ").trim() || "Hook project";
}

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function waveLabel(waveUrl: string) {
  const trimmed = waveUrl.trim();
  const match = trimmed.match(/\/waves\/([^/?#\s]+)/);

  return match?.[1] ?? (trimmed || "No chat");
}

function repoLabel(repoUrl: string) {
  const trimmed = repoUrl.trim();

  if (isPlaceholderValue(trimmed)) {
    return "GitHub repo placeholder";
  }

  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+\/[^/\s?#]+)(?:[?#].*)?$/);
  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+\/[^/\s]+?)(?:\.git)?$/);

  return (httpsMatch?.[1] ?? sshMatch?.[1] ?? trimmed) || "No GitHub repo";
}

function findPullRequestUrl(wave: CommandWave) {
  if (isPlaceholderValue(wave.repoUrl)) {
    return null;
  }

  return gitHubPullRequestUrlsForRepo(
    wave.executions.flatMap((execution) => execution.artifacts),
    wave.repoUrl,
  )[0] ?? null;
}

function hasConfiguredRepo(wave: CommandWave) {
  return Boolean(wave.repoUrl.trim() && !isPlaceholderValue(wave.repoUrl));
}

function hasPlaceholderRepo(wave: CommandWave) {
  return isPlaceholderValue(wave.repoUrl);
}

function waveStatus(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const poll = phaseWork.prPoll;

  if (!proposal) {
    return "No PR-sized hook change selected yet.";
  }

  if (poll?.decision?.url) {
    return `Project decision recorded with ${poll.yesVotes} yes and ${poll.noVotes} no.`;
  }

  if (poll?.status === "passed") {
    return "Vote passed locally. Add the project decision URL.";
  }

  if (poll) {
    return `Vote is ${poll.status}: ${poll.yesVotes} yes and ${poll.noVotes} no.`;
  }

  return "No vote required by current rules.";
}

function gateSnapshotLabel(wave: CommandWave) {
  const gates = wave.gates.map((gate) => gate.trim()).filter(Boolean);

  if (!gates.length) {
    return "access not set";
  }

  if (gates.some((gate) => /\b(rep|tdh|holder|allowlist|qna|quiz|manual|advisory|not enforced)\b/i.test(gate))) {
    return "manual review";
  }

  return "open access";
}

function gateDetails(wave: CommandWave) {
  const gates = wave.gates.map((gate) => gate.trim()).filter(Boolean);

  if (!gates.length) {
    return ["Who can join is not set yet."];
  }

  return gates.slice(0, 4);
}

function orchestrationSnapshotLabel(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const poll = phaseWork.prPoll;

  if (!proposal) {
    return "needs idea";
  }

  if (poll?.decision?.url) {
    return `${proposal.risk} approved`;
  }

  if (poll?.status === "passed") {
    return "needs receipt";
  }

  if (poll?.status === "open") {
    return `${proposal.risk} vote`;
  }

  if (poll?.status === "failed") {
    return "vote failed";
  }

  return `${proposal.risk} allowed`;
}

function codeStatus(wave: CommandWave) {
  if (hasPlaceholderRepo(wave)) {
    return "GitHub repo is a placeholder until selected.";
  }

  const phaseWork = selectPhaseWork(wave);
  const prUrl = findPullRequestUrl(wave);
  const reviewProofBound = guardianReviewProofBoundToConfiguredRepo(phaseWork.prReview, wave.repoUrl);

  if (phaseWork.prReview?.status === "pass" && reviewProofBound) {
    return "PR reviewed and logged.";
  }

  if (phaseWork.prReview?.status === "pass") {
    return "Reviewer proof must be bound to the selected GitHub repo.";
  }

  if (phaseWork.prExecution?.status === "complete") {
    return prUrl ? "PR record is ready for review." : "PR record must link to the selected GitHub repo.";
  }

  if (phaseWork.prProposal?.status === "approved") {
    return "Approved PR change is ready to build.";
  }

  if (phaseWork.prProposal) {
    return "PR change is waiting for project approval.";
  }

  return "No PR-sized hook change yet.";
}

function codeSnapshotLabel(wave: CommandWave) {
  if (hasPlaceholderRepo(wave)) {
    return "repo placeholder";
  }

  const phaseWork = selectPhaseWork(wave);
  const prUrl = findPullRequestUrl(wave);
  const reviewProofBound = guardianReviewProofBoundToConfiguredRepo(phaseWork.prReview, wave.repoUrl);

  if (phaseWork.prReview?.status === "pass" && reviewProofBound) {
    return "PR reviewed";
  }

  if (phaseWork.prReview?.status === "pass") {
    return "review proof needed";
  }

  if (phaseWork.prExecution?.status === "complete") {
    return prUrl ? "PR ready" : "PR link needed";
  }

  if (phaseWork.prProposal?.status === "approved") {
    return "ready to build";
  }

  if (phaseWork.prProposal) {
    return "needs approval";
  }

  return "no PR yet";
}

function reviewStatus(wave: CommandWave) {
  if (hasPlaceholderRepo(wave)) {
    return "not ready";
  }

  const phaseWork = selectPhaseWork(wave);
  const prUrl = findPullRequestUrl(wave);

  if (phaseWork.prReview?.status === "pass" && guardianReviewProofBoundToConfiguredRepo(phaseWork.prReview, wave.repoUrl)) {
    return "review passed";
  }

  if (phaseWork.prReview?.status === "pass") {
    return "proof needs repo";
  }

  if (phaseWork.prReview?.status === "changes_requested") {
    return "changes requested";
  }

  if (phaseWork.prReview?.status === "rule_violation") {
    return "rule violation";
  }

  if (phaseWork.prExecution?.status === "complete") {
    return prUrl ? "ready for review" : "PR link needed";
  }

  return "not reviewed";
}

export function createActiveHookProjects(input: CommandWave | CommandWave[]): ActiveHookProject[] {
  const waves = Array.isArray(input) ? input : [input];

  return waves.map((wave) => {
    const phaseWork = selectPhaseWork(wave);
    const nextAction = createPhaseNextAction(createPhaseChecklist(wave));
    const currentFocus = phaseWork.prProposal?.title ?? "Choose the first PR-sized hook change.";
    const hasProject = Boolean(wave.waveUrl.trim() && hasConfiguredRepo(wave));
    const latestActivity = ledgerEventsByRecency(wave.ledger)[0]?.message ?? "No activity logged yet.";
    const boundReviewCount = wave.reviews.filter((review) =>
      guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl),
    ).length;
    const evidenceLabel = hasPlaceholderRepo(wave)
      ? `${countLabel(wave.proposals.length, "proposal")}, repo not set`
      : [
          countLabel(wave.proposals.length, "proposal"),
          countLabel(wave.executions.length, "run"),
          countLabel(boundReviewCount, "review"),
        ].join(", ");

    return {
      id: wave.id,
      name: hookName(wave),
      status: hasProject ? "active" : "setup",
      statusLabel: hasProject ? "active" : "setup",
      waveUrl: wave.waveUrl,
      repoUrl: wave.repoUrl,
      waveLabel: waveLabel(wave.waveUrl),
      repoLabel: repoLabel(wave.repoUrl),
      currentFocus,
      participation: "Follow project chat, draft replies for manual posting, and track code work.",
      waveRole: "Where builders talk, propose, decide, and share updates.",
      platformRole: "Code state, PR record, review result, launch packet, and contribution report.",
      gateDetails: gateDetails(wave),
      gateSnapshotLabel: gateSnapshotLabel(wave),
      orchestrationSnapshotLabel: orchestrationSnapshotLabel(wave),
      codeSnapshotLabel: codeSnapshotLabel(wave),
      nextActionStatus: nextAction.status,
      nextActionLabel: nextAction.statusLabel,
      nextActionTitle: nextAction.title,
      nextActionDetail: nextAction.detail,
      waveStatus: waveStatus(wave),
      codeStatus: codeStatus(wave),
      latestPrUrl: findPullRequestUrl(wave),
      reviewStatusLabel: reviewStatus(wave),
      evidenceLabel,
      latestActivity,
    };
  });
}
