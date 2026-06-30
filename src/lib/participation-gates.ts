export const defaultParticipationGates = [
  "Manual builder review for phase 1",
  "REP or TDH gates are planned, not enforced here",
  "AI contribution report scores are not permissions",
] as const;

const advisoryPattern = /\b(planned|not enforced|not live|manual|advisory|note only|notes only|informational|outside this app)\b/i;
const authorityPattern = /\b(rep|tdh|holder|holders|threshold|qna|quiz|allowlist)\b/i;

function asGateLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(asGateLines);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value.split("\n");
}

function cleanGateLine(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return null;
  }

  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

export function participationGateNeedsAdvisoryNote(value: string) {
  const cleaned = cleanGateLine(value);

  if (!cleaned) {
    return false;
  }

  return authorityPattern.test(cleaned) && !advisoryPattern.test(cleaned);
}

function normalizeGateLine(value: string) {
  const cleaned = cleanGateLine(value);

  if (!cleaned) {
    return null;
  }

  if (participationGateNeedsAdvisoryNote(cleaned)) {
    return `${cleaned} (manual note only, not enforced by this app)`;
  }

  return cleaned;
}

export function normalizeParticipationGates(
  input: unknown,
  fallback: readonly string[] = defaultParticipationGates,
) {
  const seen = new Set<string>();
  const normalized = asGateLines(input)
    .map(normalizeGateLine)
    .filter((item): item is string => Boolean(item))
    .filter((item: string) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 6);

  if (normalized.length) {
    return normalized;
  }

  return [...fallback].map((item) => normalizeGateLine(item)).filter((item): item is string => Boolean(item));
}

export function summarizeParticipationAccess(input: unknown) {
  const gates = normalizeParticipationGates(input);

  if (!gates.length) {
    return "Participation access is not set yet.";
  }

  if (gates.some((gate) => advisoryPattern.test(gate))) {
    return "Ask in the room to join. Access is reviewed manually for now.";
  }

  return gates[0];
}

export function createParticipationAccessSnapshot(input: unknown) {
  const gates = normalizeParticipationGates(input);
  const manual = gates.some((gate) => advisoryPattern.test(gate));

  if (!gates.length) {
    return {
      label: "not set",
      summary: "Participation access is not set yet.",
      notes: ["Set who can join before inviting builders."],
    };
  }

  if (manual) {
    return {
      label: "manual review",
      summary: "Ask in the room to join. Access is reviewed manually for now.",
      notes: gates.slice(0, 2),
    };
  }

  return {
    label: "open",
    summary: gates[0],
    notes: gates.slice(0, 2),
  };
}
