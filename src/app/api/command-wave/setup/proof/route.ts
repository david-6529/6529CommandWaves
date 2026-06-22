import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createSetupProof, setupProofOptionsFromEnv } from "@/lib/setup-proof";

export async function GET() {
  try {
    return json({
      proof: createSetupProof(await getCommandWave(), setupProofOptionsFromEnv()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
