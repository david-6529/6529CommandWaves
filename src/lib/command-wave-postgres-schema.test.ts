import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Command Waves Postgres schema", () => {
  const schema = readFileSync(join(process.cwd(), "db", "001_command_waves.sql"), "utf8");

  it("defines the core production tables", () => {
    for (const table of [
      "command_waves",
      "command_wave_rules",
      "command_proposals",
      "command_polls",
      "command_votes",
      "command_executions",
      "guardian_reviews",
      "command_ledger_events",
      "cached_waves",
      "cached_wave_drops",
      "command_jobs",
    ]) {
      expect(schema).toContain(`create table if not exists ${table}`);
    }
  });

  it("keeps rule versions and ledger events queryable by wave", () => {
    expect(schema).toContain("unique (command_wave_id, version)");
    expect(schema).toContain("unique (command_wave_id, rules_hash)");
    expect(schema).toContain("command_ledger_events_wave_created_idx");
  });

  it("indexes job queue and 6529 drop cache access patterns", () => {
    expect(schema).toContain("command_jobs_status_run_after_idx");
    expect(schema).toContain("cached_wave_drops_wave_serial_idx");
    expect(schema).toContain("cached_wave_drops_author_idx");
  });
});
