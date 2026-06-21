import { json } from "@/lib/api";
import { getReadinessChecks, getReadinessSummary } from "@/lib/system/readiness";

export async function GET() {
  const checks = getReadinessChecks();

  return json({
    summary: getReadinessSummary(checks),
    checks,
  });
}
