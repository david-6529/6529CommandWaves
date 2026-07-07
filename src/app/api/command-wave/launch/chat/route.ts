import { handleRouteError, json } from "@/lib/api";
import { createChatLaunchSnapshot } from "@/lib/chat-launch-snapshot";
import { getCommandWave } from "@/lib/command-wave-store";
import { createFirstPhaseLaunchSnapshot } from "@/lib/first-phase-launch-snapshot";
import { assertRateLimit } from "@/lib/rate-limit";

function shouldCheckSetupRemote(request: Request) {
  const value = new URL(request.url).searchParams.get("remote")?.trim().toLowerCase();

  return value === "1" || value === "true";
}

export async function GET(request: Request) {
  try {
    const checkSetupRemote = shouldCheckSetupRemote(request);

    assertRateLimit(request, { namespace: "chat_launch", max: 30, windowMs: 60_000 });

    if (checkSetupRemote) {
      assertRateLimit(request, { namespace: "chat_launch_remote", max: 10, windowMs: 60_000 });
    }

    return json({
      audit: createChatLaunchSnapshot(
        await createFirstPhaseLaunchSnapshot(await getCommandWave(), {
          checkSetupRemote,
        }),
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
