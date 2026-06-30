import { handleRouteError, json } from "@/lib/api";
import { searchWaves } from "@/lib/6529/wave-search";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "6529_wave_search", max: 30, windowMs: 60_000 });

    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const limit = Number(url.searchParams.get("limit") ?? 8);

    return json({
      results: await searchWaves(query, {
        limit: Number.isFinite(limit) ? limit : 8,
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
