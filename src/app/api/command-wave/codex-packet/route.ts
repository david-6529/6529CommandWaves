import { requireAdminRequest } from "@/lib/admin-auth";
import { handleRouteError, json, readJsonObject } from "@/lib/api";
import { createCodexWorkPacket } from "@/lib/codex-work-packet";
import { getCommandWave } from "@/lib/command-wave-store";

const allowedStatuses = new Set(["approved", "reviewing", "complete"]);

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    requireAdminRequest(request);

    const body = await readJsonObject(request);
    const proposalId = asText(body.proposalId);
    const wave = await getCommandWave();
    const proposal = wave.proposals.find((item) => item.id === proposalId);

    if (!proposal) {
      throw Object.assign(new Error("Proposal not found."), { status: 404 });
    }

    if (proposal.kind !== "open_pr") {
      throw Object.assign(new Error("Codex work packets are only available for PR commands."), { status: 409 });
    }

    if (!allowedStatuses.has(proposal.status)) {
      throw Object.assign(new Error("Proposal must be approved before creating a Codex work packet."), { status: 409 });
    }

    return json({
      packet: createCodexWorkPacket({
        wave,
        proposal,
        poll: wave.polls.find((item) => item.proposalId === proposal.id) ?? null,
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
