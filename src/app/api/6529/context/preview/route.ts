import { handleRouteError, json } from "@/lib/api";
import { previewWaveContext } from "@/lib/6529/wave-context";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRateLimit(request, { namespace: "6529_context_preview", max: 20, windowMs: 60_000 });

    return json({
      preview: await previewWaveContext(await request.json()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
