import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { commandWaveResponse } from "@/lib/command-wave-response";
import { getCommandWave, resetCommandWave, updateCommandWaveSetup } from "@/lib/command-wave-store";
import { rejectPhaseOneStateReplacement } from "@/lib/phase-one-api-policy";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    assertRateLimit(request, { namespace: "command_wave_read", max: 60, windowMs: 60_000 });

    return json(commandWaveResponse(await getCommandWave()));
  } catch (error) {
    return handleRouteError(error);
  }
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

    return json(commandWaveResponse(await updateCommandWaveSetup(await readJsonObject(request))));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminRequest(request);

    return json(commandWaveResponse(await resetCommandWave()));
  } catch (error) {
    return handleRouteError(error);
  }
}
