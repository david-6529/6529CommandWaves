import { handleRouteError, json } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getCommandWave, replaceCommandWave, resetCommandWave, updateCommandWaveSetup } from "@/lib/command-wave-store";
import type { CommandWave } from "@/lib/command-waves";

export async function GET() {
  return json({ wave: await getCommandWave() });
}

export async function PUT(request: Request) {
  try {
    requireAdminRequest(request);

    const body = await request.json() as { wave?: CommandWave };

    if (!body.wave) {
      throw Object.assign(new Error("Missing wave."), { status: 400 });
    }

    return json({ wave: await replaceCommandWave(body.wave) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdminRequest(request);

    return json({ wave: await updateCommandWaveSetup(await request.json()) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminRequest(request);

    return json({ wave: await resetCommandWave() });
  } catch (error) {
    return handleRouteError(error);
  }
}
