import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createCommandWaveStateSnapshot } from "@/lib/command-wave-state";

export async function GET() {
  try {
    return json(createCommandWaveStateSnapshot(await getCommandWave()));
  } catch (error) {
    return handleRouteError(error);
  }
}
