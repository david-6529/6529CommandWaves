import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { assertRateLimit } from "@/lib/rate-limit";
import { validateCommandWaveSetup } from "@/lib/setup-validation";

export async function POST(request: Request) {
  try {
    assertRateLimit(request, { namespace: "setup_validate", max: 10, windowMs: 60_000 });

    return json({
      validation: await validateCommandWaveSetup(await readJsonObject(request), {
        checkWaveRemote: true,
        checkRepoRemote: true,
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
