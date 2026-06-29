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
};

function hookName(wave: CommandWave) {
  if (/6529[-\s]?hook/i.test(`${wave.name} ${wave.repoUrl}`)) {
    return "6529 Hook";
  }

  return wave.name.replace(/\b(builder|wave|command)\b/gi, "").replace(/\s+/g, " ").trim() || "Hook project";
}

export function createActiveHookProjects(wave: CommandWave): ActiveHookProject[] {
  const phaseWork = selectPhaseWork(wave);
  const currentFocus = phaseWork.prProposal?.title ?? "Choose the first PR-sized hook command.";
  const hasProject = Boolean(wave.waveUrl.trim() && wave.repoUrl.trim());

  return [
    {
      id: wave.id,
      name: hookName(wave),
      status: hasProject ? "active" : "setup",
      statusLabel: hasProject ? "active" : "setup",
      waveUrl: wave.waveUrl,
      repoUrl: wave.repoUrl,
      currentFocus,
      participation: "Anyone can propose PR-sized hook work through the builder wave.",
    },
  ];
}
