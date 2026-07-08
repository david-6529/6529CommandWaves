import type { CommandWave } from "./command-waves";
import { createPublicCommandWave } from "./public-command-wave";

export function commandWaveResponse(wave: CommandWave) {
  return {
    wave: createPublicCommandWave(wave),
  };
}
