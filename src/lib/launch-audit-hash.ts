import { hashValue } from "./run-manifest";

export function launchAuditHashInput(snapshot: Record<string, unknown>) {
  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    project: snapshot.project,
    setupCheckMode: snapshot.setupCheckMode,
    projectSnapshot: snapshot.projectSnapshot,
    hookSafety: snapshot.hookSafety,
    workflowProof: snapshot.workflowProof,
    access: snapshot.access,
    productContract: snapshot.productContract,
    authorityBoundary: snapshot.authorityBoundary,
    agents: snapshot.agents,
    stateEvidence: snapshot.stateEvidence,
    verificationTargets: snapshot.verificationTargets,
    setupValidation: snapshot.setupValidation,
    statusDraft: snapshot.statusDraft,
    launchPacket: snapshot.launchPacket,
    reports: snapshot.reports,
    readiness: snapshot.readiness,
    phaseChecklist: snapshot.phaseChecklist,
    launchAudit: snapshot.launchAudit,
  };
}

export function createLaunchAuditHash(snapshot: Record<string, unknown>) {
  return hashValue(launchAuditHashInput(snapshot));
}
