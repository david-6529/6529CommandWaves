import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { commandWaveResponse } from "@/lib/command-wave-response";
import { reviewProposal } from "@/lib/command-wave-store";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);

    return json(commandWaveResponse(await reviewProposal(await readJsonObject(request))));
  } catch (error) {
    return handleRouteError(error);
  }
}
