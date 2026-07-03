import { describe, expect, it } from "vitest";
import { getCommandWaveRepository } from "./command-wave-repository";

describe("command wave repository selection", () => {
  it("auto-selects Postgres in production only with a real database URL", () => {
    expect(
      getCommandWaveRepository({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://command_waves:strong-password@db.internal:5432/command_waves",
      }).mode,
    ).toBe("postgres");
    expect(
      getCommandWaveRepository({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:password@host:5432/command_waves",
      }).mode,
    ).toBe("memory");
  });

  it("keeps explicit Postgres selection visible even when the URL is not ready", () => {
    expect(
      getCommandWaveRepository({
        NODE_ENV: "production",
        COMMAND_WAVE_STORE: "postgres",
        DATABASE_URL: "postgresql://user:password@host:5432/command_waves",
      }).mode,
    ).toBe("postgres");
  });
});
