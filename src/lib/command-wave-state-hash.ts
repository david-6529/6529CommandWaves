import { hashValue } from "./run-manifest";

export function commandWaveStateHashInput(snapshot: Record<string, unknown>) {
  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    wave: snapshot.wave,
    waveStateHash: snapshot.waveStateHash,
    projectSnapshot: snapshot.projectSnapshot,
    hookSafety: snapshot.hookSafety,
    workflowProof: snapshot.workflowProof,
    access: snapshot.access,
    productContract: snapshot.productContract,
    authorityBoundary: snapshot.authorityBoundary,
    agents: snapshot.agents,
    reports: snapshot.reports,
    guardian: snapshot.guardian,
  };
}

export function createCommandWaveStateHash(snapshot: Record<string, unknown>) {
  return hashValue(commandWaveStateHashInput(snapshot));
}
