import { isPlaceholderValue } from "./env-placeholders";

export function isProjectPreviewMode(env: Record<string, string | undefined> = process.env) {
  const waveUrl = env.COMMAND_WAVE_INITIAL_WAVE_URL?.trim();

  return env["6529_MOCK_MODE"] !== "false" || !waveUrl || isPlaceholderValue(waveUrl);
}
