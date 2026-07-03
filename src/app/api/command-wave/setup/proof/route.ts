import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { assertRateLimit } from "@/lib/rate-limit";
import { createSetupProof, setupProofOptionsFromEnv } from "@/lib/setup-proof";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "setup_proof", max: 30, windowMs: 60_000 });

    return json({
      proof: createSetupProof(await getCommandWave(), setupProofOptionsFromEnv()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
