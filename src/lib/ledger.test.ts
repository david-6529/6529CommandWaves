import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { latestLedgerTimestamp, ledgerEventsByRecency, ledgerEventsForVisibleProjectHistory } from "./ledger";

describe("ledger helpers", () => {
  it("orders demo ledger events by timestamp for recent activity", () => {
    const ordered = ledgerEventsByRecency(demoWave.ledger);

    expect(ordered[0]).toMatchObject({
      id: "evt-006",
      type: "guardian_reviewed",
    });
    expect(ordered.at(-1)).toMatchObject({
      id: "evt-001",
      type: "wave_created",
    });
  });

  it("returns the newest ledger timestamp", () => {
    expect(latestLedgerTimestamp(demoWave.ledger)).toBe("2026-06-20T12:50:00.000Z");
    expect(latestLedgerTimestamp([])).toBe("1970-01-01T00:00:00.000Z");
  });

  it("hides repo-bound events while the repo is a placeholder", () => {
    const visibleEvents = ledgerEventsForVisibleProjectHistory(demoWave.ledger, demoWave.repoUrl);

    expect(visibleEvents[0]).toMatchObject({
      id: "evt-004",
      type: "poll_passed",
    });
    expect(visibleEvents.map((event) => event.type)).not.toContain("execution_logged");
    expect(visibleEvents.map((event) => event.type)).not.toContain("guardian_reviewed");
  });

  it("shows repo-bound events after a real repo is configured", () => {
    const visibleEvents = ledgerEventsForVisibleProjectHistory(demoWave.ledger, "https://github.com/builders/hook");

    expect(visibleEvents[0]).toMatchObject({
      id: "evt-006",
      type: "guardian_reviewed",
    });
  });
});
