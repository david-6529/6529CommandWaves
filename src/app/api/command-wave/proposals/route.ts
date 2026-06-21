import { handleRouteError, json } from "@/lib/api";
import { requireAdminRequest } from "@/lib/admin-auth";
import { submitCommandProposal } from "@/lib/command-wave-store";

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);

    return json({ wave: await submitCommandProposal(await request.json()) });
  } catch (error) {
    return handleRouteError(error);
  }
}
