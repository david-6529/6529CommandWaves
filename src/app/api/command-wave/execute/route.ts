import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { executeProposal } from "@/lib/command-wave-store";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);

    return json({ wave: await executeProposal(await readJsonObject(request)) });
  } catch (error) {
    return handleRouteError(error);
  }
}
