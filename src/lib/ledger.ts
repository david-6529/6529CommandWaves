import type { LedgerEvent } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";

function ledgerEventTime(event: LedgerEvent) {
  const time = Date.parse(event.at);

  return Number.isFinite(time) ? time : 0;
}

const repoBoundEventTypes = new Set<LedgerEvent["type"]>(["execution_started", "execution_logged", "guardian_reviewed"]);

export function ledgerEventsByRecency(events: LedgerEvent[]) {
  return [...events].sort((left, right) => ledgerEventTime(right) - ledgerEventTime(left));
}

export function ledgerEventsForVisibleProjectHistory(events: LedgerEvent[], repoUrl: string) {
  const repoSelected = Boolean(repoUrl.trim() && !isPlaceholderValue(repoUrl));
  const sortedEvents = ledgerEventsByRecency(events);

  if (repoSelected) {
    return sortedEvents;
  }

  return sortedEvents.filter((event) => !repoBoundEventTypes.has(event.type));
}

export function latestLedgerTimestamp(events: LedgerEvent[], fallback = new Date(0).toISOString()) {
  return ledgerEventsByRecency(events)[0]?.at ?? fallback;
}
