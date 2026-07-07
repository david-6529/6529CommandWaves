import { handleRouteError, json } from "@/lib/api";
import { getCommandWave } from "@/lib/command-wave-store";
import { createPublicVerificationManifest } from "@/lib/public-verification-manifest";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "verification_manifest", max: 30, windowMs: 60_000 });

    return json({
      manifest: await createPublicVerificationManifest(await getCommandWave()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
