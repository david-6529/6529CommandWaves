import type { CommandWave } from "./command-waves";
import { createActiveHookProjects, type ActiveHookProject } from "./hook-projects";
import { createPublicCommandWaveSource } from "./public-command-wave";
import { hashValue } from "./run-manifest";

export type HookProjectIndex = {
  version: "command-wave-projects-v0.1";
  generatedAt: string;
  activeProjectId: string | null;
  projectCount: number;
  projects: ActiveHookProject[];
  projectsHash: string;
};

export function hookProjectIndexHashInput(index: Record<string, unknown>) {
  return {
    version: index.version,
    activeProjectId: index.activeProjectId,
    projectCount: index.projectCount,
    projects: index.projects,
  };
}

export function createHookProjectIndex(
  input: CommandWave | CommandWave[],
  options: { generatedAt?: string } = {},
): HookProjectIndex {
  const publicSourceWaves = (Array.isArray(input) ? input : [input]).map(createPublicCommandWaveSource);
  const projects = createActiveHookProjects(publicSourceWaves);
  const indexWithoutHash = {
    version: "command-wave-projects-v0.1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    activeProjectId: projects[0]?.id ?? null,
    projectCount: projects.length,
    projects,
  } satisfies Omit<HookProjectIndex, "projectsHash">;

  return {
    ...indexWithoutHash,
    projectsHash: hashValue(hookProjectIndexHashInput(indexWithoutHash)),
  };
}
