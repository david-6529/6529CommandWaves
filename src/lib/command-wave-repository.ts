import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CommandWave } from "./command-waves";
import { postgresCommandWaveRepository } from "./postgres/command-wave-postgres-repository";

export type CommandWaveRepository = {
  mode: "memory" | "file" | "postgres";
  load(): Promise<CommandWave | null>;
  save(wave: CommandWave): Promise<void>;
  delete(): Promise<void>;
};

const defaultStorePath = ".data/command-wave.json";
const testStorePath = ".data/command-wave-test.json";

function isCommandWave(value: unknown): value is CommandWave {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<CommandWave>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.waveUrl === "string" &&
    typeof candidate.repoUrl === "string" &&
    Array.isArray(candidate.proposals) &&
    Array.isArray(candidate.polls) &&
    Array.isArray(candidate.executions) &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.ledger)
  );
}

function fileRepository(storePath: string): CommandWaveRepository {
  return {
    mode: "file",
    async load() {
      if (!existsSync(storePath)) {
        return null;
      }

      const parsed = JSON.parse(readFileSync(storePath, "utf8")) as unknown;

      if (!isCommandWave(parsed)) {
        throw Object.assign(new Error("Persisted command wave state is malformed."), { status: 500 });
      }

      return parsed;
    },
    async save(wave) {
      mkdirSync(dirname(storePath), { recursive: true });

      const tempPath = `${storePath}.${process.pid}.tmp`;

      writeFileSync(tempPath, `${JSON.stringify(wave, null, 2)}\n`, "utf8");
      renameSync(tempPath, storePath);
    },
    async delete() {
      if (existsSync(storePath)) {
        unlinkSync(storePath);
      }
    },
  };
}

function memoryRepository(): CommandWaveRepository {
  return {
    mode: "memory",
    async load() {
      return null;
    },
    async save() {},
    async delete() {},
  };
}

export function getCommandWaveRepository(env: Record<string, string | undefined> = process.env): CommandWaveRepository {
  if (env.COMMAND_WAVE_STORE === "memory") {
    return memoryRepository();
  }

  if (env.COMMAND_WAVE_STORE === "postgres" || (env.NODE_ENV === "production" && env.DATABASE_URL)) {
    return postgresCommandWaveRepository();
  }

  if (env.NODE_ENV === "test") {
    return fileRepository(testStorePath);
  }

  if (env.COMMAND_WAVE_STORE === "file" || env.NODE_ENV === "development") {
    return fileRepository(defaultStorePath);
  }

  return memoryRepository();
}
