import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { latestLedgerTimestamp, ledgerEventsByRecency } from "./ledger";

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
});
