import { handleRouteError, json } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";
import { getReadinessChecks, getReadinessSummary } from "@/lib/system/readiness";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "readiness", max: 30, windowMs: 60_000 });

    const checks = getReadinessChecks();

    return json({
      summary: getReadinessSummary(checks),
      checks,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
