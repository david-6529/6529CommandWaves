import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createSetupProof } from "@/lib/setup-proof";

export async function GET() {
  try {
    return json({
      proof: createSetupProof(await getCommandWave()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
