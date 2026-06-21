import { handleRouteError, json } from "@/lib/api";
import { validateCommandWaveSetup } from "@/lib/setup-validation";

export async function POST(request: Request) {
  try {
    return json({
      validation: await validateCommandWaveSetup(await request.json(), {
        checkWaveRemote: true,
        checkRepoRemote: true,
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
