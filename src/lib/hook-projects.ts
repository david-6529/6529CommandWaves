import type { CommandWave } from "./command-waves";
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
    return "6529 Hook";
  }

  return wave.name.replace(/\b(builder|wave|command)\b/gi, "").replace(/\s+/g, " ").trim() || "Hook project";
}

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function waveLabel(waveUrl: string) {
  const trimmed = waveUrl.trim();
  const match = trimmed.match(/\/waves\/([^/?#\s]+)/);

  return match?.[1] ?? (trimmed || "No builder wave");
}

function repoLabel(repoUrl: string) {
  const trimmed = repoUrl.trim();
  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+\/[^/\s?#]+)(?:[?#].*)?$/);
  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+\/[^/\s]+?)(?:\.git)?$/);

  return (httpsMatch?.[1] ?? sshMatch?.[1] ?? trimmed) || "No GitHub repo";
}

function findPullRequestUrl(wave: CommandWave) {
  return (
    wave.executions
      .flatMap((execution) => execution.artifacts)
      .find((artifact) => /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/.test(artifact)) ?? null
  );
}

function waveStatus(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const poll = phaseWork.prPoll;

  if (!proposal) {
    return "Wave has not selected a PR-sized hook command yet.";
  }

  if (poll?.decision?.url) {
    return `Wave decision recorded with ${poll.yesVotes} yes and ${poll.noVotes} no.`;
  }

  if (poll?.status === "passed") {
    return "Vote passed locally. Record the 6529 decision URL.";
  }

  if (poll) {
    return `Vote is ${poll.status}: ${poll.yesVotes} yes and ${poll.noVotes} no.`;
  }

  return "No vote required by current rules.";
}

function gateSnapshotLabel(wave: CommandWave) {
  const gates = wave.gates.map((gate) => gate.trim()).filter(Boolean);

  if (!gates.length) {
    return "gate unset";
  }

  if (gates.some((gate) => /\b(rep|tdh|holder|allowlist|qna|quiz|manual|advisory|not enforced)\b/i.test(gate))) {
    return "manual gate";
  }

  return "open gate";
}

function gateDetails(wave: CommandWave) {
  const gates = wave.gates.map((gate) => gate.trim()).filter(Boolean);

  if (!gates.length) {
    return ["Participation gate is not set yet."];
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
  const phaseWork = selectPhaseWork(wave);

  if (phaseWork.prReview?.status === "pass") {
    return "PR reviewed and logged.";
  }

  if (phaseWork.prExecution?.status === "complete") {
    return "PR evidence is ready for review.";
  }

  if (phaseWork.prProposal?.status === "approved") {
    return "Approved PR command is ready to build.";
  }

  if (phaseWork.prProposal) {
    return "PR command is waiting for wave approval.";
  }

  return "No PR-sized hook command yet.";
}

function codeSnapshotLabel(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);

  if (phaseWork.prReview?.status === "pass") {
    return "PR reviewed";
  }

  if (phaseWork.prExecution?.status === "complete") {
    return "PR ready";
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
  const phaseWork = selectPhaseWork(wave);

  if (phaseWork.prReview?.status === "pass") {
    return "review passed";
  }

  if (phaseWork.prReview?.status === "changes_requested") {
    return "changes requested";
  }

  if (phaseWork.prReview?.status === "rule_violation") {
    return "rule violation";
  }

  if (phaseWork.prExecution?.status === "complete") {
    return "ready for review";
  }

  return "not reviewed";
}

export function createActiveHookProjects(input: CommandWave | CommandWave[]): ActiveHookProject[] {
  const waves = Array.isArray(input) ? input : [input];

  return waves.map((wave) => {
    const phaseWork = selectPhaseWork(wave);
    const nextAction = createPhaseNextAction(createPhaseChecklist(wave));
    const currentFocus = phaseWork.prProposal?.title ?? "Choose the first PR-sized hook command.";
    const hasProject = Boolean(wave.waveUrl.trim() && wave.repoUrl.trim());
    const latestActivity = ledgerEventsByRecency(wave.ledger)[0]?.message ?? "No activity logged yet.";

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
      participation: "Read the wave, draft replies for manual posting, and track repo work.",
      waveRole: "Live discussion, proposals, decisions, and updates.",
      platformRole: "GitHub repo state, PR evidence, review proof, launch packet, and contribution report.",
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
      evidenceLabel: [
        countLabel(wave.proposals.length, "command"),
        countLabel(wave.executions.length, "run"),
        countLabel(wave.reviews.length, "review"),
      ].join(", "),
      latestActivity,
    };
  });
}
