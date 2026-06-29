import type { CommandWave } from "./command-waves";
import { selectPhaseWork } from "./phase-work";

export type ActiveHookProject = {
  id: string;
  name: string;
  status: "active" | "setup";
  statusLabel: string;
  waveUrl: string;
  repoUrl: string;
  currentFocus: string;
  participation: string;
  waveRole: string;
  platformRole: string;
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

export function createActiveHookProjects(wave: CommandWave): ActiveHookProject[] {
  const phaseWork = selectPhaseWork(wave);
  const currentFocus = phaseWork.prProposal?.title ?? "Choose the first PR-sized hook command.";
  const hasProject = Boolean(wave.waveUrl.trim() && wave.repoUrl.trim());
  const latestActivity = wave.ledger.at(-1)?.message ?? "No activity logged yet.";

  return [
    {
      id: wave.id,
      name: hookName(wave),
      status: hasProject ? "active" : "setup",
      statusLabel: hasProject ? "active" : "setup",
      waveUrl: wave.waveUrl,
      repoUrl: wave.repoUrl,
      currentFocus,
      participation: "Discuss in the 6529 wave. Track the code work here.",
      waveRole: "6529 wave: live discussion, proposals, and decisions.",
      platformRole: "This site: GitHub repo, PRs, reviews, launch evidence, and contribution reports.",
      waveStatus: waveStatus(wave),
      codeStatus: codeStatus(wave),
      latestPrUrl: findPullRequestUrl(wave),
      reviewStatusLabel: phaseWork.prReview?.status.replaceAll("_", " ") ?? "not reviewed",
      evidenceLabel: [
        countLabel(wave.proposals.length, "command"),
        countLabel(wave.executions.length, "run"),
        countLabel(wave.reviews.length, "review"),
      ].join(", "),
      latestActivity,
    },
  ];
}
