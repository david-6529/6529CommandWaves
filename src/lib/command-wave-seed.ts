import { defaultParticipationGates } from "./participation-gates";
import { validateSetupShape } from "./setup-validation";
import { defaultRules, type CommandWave } from "./command-waves";

export type CommandWaveSeedEnv = {
  COMMAND_WAVE_INITIAL_NAME?: string;
  COMMAND_WAVE_INITIAL_WAVE_URL?: string;
  COMMAND_WAVE_INITIAL_REPO_URL?: string;
} & Record<string, string | undefined>;

function envText(value: string | undefined) {
  return value?.trim() || "";
}

export function hasInitialCommandWaveProject(env: CommandWaveSeedEnv = process.env) {
  return Boolean(envText(env.COMMAND_WAVE_INITIAL_WAVE_URL) || envText(env.COMMAND_WAVE_INITIAL_REPO_URL));
}

export function applyInitialCommandWaveProject(
  fallback: CommandWave,
  env: CommandWaveSeedEnv = process.env,
  options: {
    generatedAt?: string;
  } = {},
): CommandWave {
  if (!hasInitialCommandWaveProject(env)) {
    return fallback;
  }

  const name = envText(env.COMMAND_WAVE_INITIAL_NAME) || fallback.name;
  const waveUrl = envText(env.COMMAND_WAVE_INITIAL_WAVE_URL) || fallback.waveUrl;
  const repoUrl = envText(env.COMMAND_WAVE_INITIAL_REPO_URL) || fallback.repoUrl;
  let validation: ReturnType<typeof validateSetupShape>;

  try {
    validation = validateSetupShape({ waveUrl, repoUrl });
  } catch {
    validation = {
      waveId: null,
      repo: null,
      repoMetadata: null,
      repoRequiredFiles: [],
      checks: [],
      canSave: false,
      canRunCode: false,
    };
  }

  if (!validation.waveId || !validation.repo || !validation.canSave) {
    throw Object.assign(
      new Error("Fix COMMAND_WAVE_INITIAL_WAVE_URL and COMMAND_WAVE_INITIAL_REPO_URL before starting the first project."),
      { status: 500 },
    );
  }

  return {
    ...fallback,
    name,
    waveUrl: `https://6529.io/waves/${validation.waveId}`,
    repoUrl: validation.repo.htmlUrl,
    gates: [...defaultParticipationGates],
    rules: defaultRules,
    proposals: [],
    polls: [],
    executions: [],
    reviews: [],
    ledger: [
      {
        id: "evt-001",
        at: options.generatedAt ?? new Date().toISOString(),
        actor: "Setup",
        type: "wave_created",
        message: "Created the first hook project from environment setup.",
      },
    ],
  };
}
