import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createHookProjectIndex } from "@/lib/hook-project-index";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "command_wave_projects", max: 60, windowMs: 60_000 });

    return json(createHookProjectIndex(await getCommandWave()));
  } catch (error) {
    return handleRouteError(error);
  }
}
