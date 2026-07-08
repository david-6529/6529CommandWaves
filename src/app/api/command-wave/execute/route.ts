import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { commandWaveResponse } from "@/lib/command-wave-response";
import { executeProposal } from "@/lib/command-wave-store";
import { executionRequestBodyMaxBytes } from "@/lib/execution-files";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);

    const body = await readJsonObject(request, { maxBytes: executionRequestBodyMaxBytes });

    return json(commandWaveResponse(await executeProposal(body)));
  } catch (error) {
    return handleRouteError(error);
  }
}
