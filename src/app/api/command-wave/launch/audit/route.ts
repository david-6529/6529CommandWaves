import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createFirstPhaseLaunchSnapshot } from "@/lib/first-phase-launch-snapshot";

function shouldCheckSetupRemote(request: Request) {
  const value = new URL(request.url).searchParams.get("remote")?.trim().toLowerCase();

  return value === "1" || value === "true";
}

export async function GET(request: Request) {
  try {
    return json({
      audit: await createFirstPhaseLaunchSnapshot(await getCommandWave(), {
        checkSetupRemote: shouldCheckSetupRemote(request),
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
