import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createCommandWaveStateSnapshot } from "@/lib/command-wave-state";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "command_wave_state", max: 60, windowMs: 60_000 });

    return json(createCommandWaveStateSnapshot(await getCommandWave()));
  } catch (error) {
    return handleRouteError(error);
  }
}
