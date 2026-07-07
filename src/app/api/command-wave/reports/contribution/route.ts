import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createPublicContributionReport } from "@/lib/public-contribution-report";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "contribution_report", max: 60, windowMs: 60_000 });

    return json(createPublicContributionReport(await getCommandWave()));
  } catch (error) {
    return handleRouteError(error);
  }
}
