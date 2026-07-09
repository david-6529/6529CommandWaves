import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { commandWaveResponse } from "@/lib/command-wave-response";
import { recordProjectChatPreviewObservations } from "@/lib/command-wave-store";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);
    assertRateLimit(request, { namespace: "command_wave_chat_observe", max: 10, windowMs: 60_000 });

    const result = await recordProjectChatPreviewObservations(await readJsonObject(request));

    return json({
      ...commandWaveResponse(result.wave),
      observedCount: result.observedCount,
      skippedCount: result.skippedCount,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
