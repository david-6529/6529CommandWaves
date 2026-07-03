import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getCommandWave, resetCommandWave, updateCommandWaveSetup } from "@/lib/command-wave-store";
import { rejectPhaseOneStateReplacement } from "@/lib/phase-one-api-policy";

export async function GET() {
  return json({ wave: await getCommandWave() });
}

export async function PUT(request: Request) {
  try {
    requireAdminRequest(request);

    rejectPhaseOneStateReplacement();
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdminRequest(request);

    return json({ wave: await updateCommandWaveSetup(await readJsonObject(request)) });
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
