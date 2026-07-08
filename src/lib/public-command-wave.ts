import { withPlaceholderRepoSetupState } from "./command-wave-sanitize";
import type { CommandWave, LedgerEvent } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";

export type PublicCommandWave = Omit<CommandWave, "repoUrl"> & {
  repoUrl: string | null;
};

const repoBoundPublicEventTypes = new Set<LedgerEvent["type"]>([
  "execution_started",
  "execution_logged",
  "guardian_reviewed",
]);

export function createPublicCommandWaveSource(wave: CommandWave): CommandWave {
  const setupSafeWave = withPlaceholderRepoSetupState(wave);

  if (!isPlaceholderValue(setupSafeWave.repoUrl)) {
    return setupSafeWave;
  }

  return {
    ...setupSafeWave,
    executions: [],
    reviews: [],
    ledger: setupSafeWave.ledger.filter((event) => !repoBoundPublicEventTypes.has(event.type)),
  };
}

export function createPublicCommandWave(wave: CommandWave): PublicCommandWave {
  const publicSourceWave = createPublicCommandWaveSource(wave);

  return {
    ...publicSourceWave,
    repoUrl: isPlaceholderValue(publicSourceWave.repoUrl) ? null : publicSourceWave.repoUrl,
  };
}
