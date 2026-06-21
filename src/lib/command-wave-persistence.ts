import type { CommandWave } from "./command-waves";
import { getCommandWaveRepository } from "./command-wave-repository";

export function getCommandWavePersistencePath() {
  const repository = getCommandWaveRepository();

  return repository.mode === "file" ? repository.mode : null;
}

export function getCommandWaveStoreMode() {
  return getCommandWaveRepository().mode;
}

export function loadPersistedCommandWave() {
  return getCommandWaveRepository().load();
}

export function savePersistedCommandWave(wave: CommandWave) {
  return getCommandWaveRepository().save(wave);
}

export function deletePersistedCommandWave() {
  return getCommandWaveRepository().delete();
}
