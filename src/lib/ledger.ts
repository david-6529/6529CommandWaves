import type { LedgerEvent } from "./command-waves";

function ledgerEventTime(event: LedgerEvent) {
  const time = Date.parse(event.at);

  return Number.isFinite(time) ? time : 0;
}

export function ledgerEventsByRecency(events: LedgerEvent[]) {
  return [...events].sort((left, right) => ledgerEventTime(right) - ledgerEventTime(left));
}

export function latestLedgerTimestamp(events: LedgerEvent[], fallback = new Date(0).toISOString()) {
  return ledgerEventsByRecency(events)[0]?.at ?? fallback;
}
