import type { FirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import type { FirstPhaseLaunchAuditTrack, FirstPhaseLaunchNextAction } from "./first-phase-launch-audit";
import { verifyChatLaunchAuditPayload, type ChatLaunchVerificationResult } from "./chat-launch-verifier";
import { hashValue } from "./run-manifest";

type ChatLaunchSnapshotVerification = Omit<ChatLaunchVerificationResult, "statusDraft" | "chatLaunchHash">;

export type ChatLaunchSnapshot = {
  version: "command-wave-chat-launch-v0.1";
  generatedAt: string;
  sourceAuditHash: string;
  chatLaunchHash: string;
  project: FirstPhaseLaunchSnapshot["project"];
  setupCheckMode: FirstPhaseLaunchSnapshot["setupCheckMode"];
  stateEvidence: FirstPhaseLaunchSnapshot["stateEvidence"];
  chatLaunch: FirstPhaseLaunchAuditTrack;
  prLoop: {
    status: FirstPhaseLaunchSnapshot["launchAudit"]["status"];
    statusLabel: FirstPhaseLaunchSnapshot["launchAudit"]["statusLabel"];
    summary: string;
    nextAction: FirstPhaseLaunchNextAction;
  };
  verificationTargets: FirstPhaseLaunchSnapshot["verificationTargets"];
  verification: ChatLaunchSnapshotVerification;
};

export function createChatLaunchSnapshot(snapshot: FirstPhaseLaunchSnapshot): ChatLaunchSnapshot {
  const verificationResult = verifyChatLaunchAuditPayload(snapshot);
  const verification = {
    status: verificationResult.status,
    chatLaunchStatus: verificationResult.chatLaunchStatus,
    launchStatus: verificationResult.launchStatus,
    generatedAt: verificationResult.generatedAt,
    projectName: verificationResult.projectName,
    nextAction: verificationResult.nextAction,
    auditHash: verificationResult.auditHash,
    blockers: verificationResult.blockers,
    openItems: verificationResult.openItems,
    operatorChecklist: verificationResult.operatorChecklist,
    checks: verificationResult.checks,
  };

  const snapshotWithoutHash = {
    version: "command-wave-chat-launch-v0.1",
    generatedAt: snapshot.generatedAt,
    sourceAuditHash: snapshot.auditHash,
    project: snapshot.project,
    setupCheckMode: snapshot.setupCheckMode,
    stateEvidence: snapshot.stateEvidence,
    chatLaunch: snapshot.launchAudit.chatLaunch,
    prLoop: {
      status: snapshot.launchAudit.status,
      statusLabel: snapshot.launchAudit.statusLabel,
      summary: snapshot.launchAudit.summary,
      nextAction: snapshot.launchAudit.nextAction,
    },
    verificationTargets: snapshot.verificationTargets,
    verification,
  } satisfies Omit<ChatLaunchSnapshot, "chatLaunchHash">;

  return {
    ...snapshotWithoutHash,
    chatLaunchHash: hashValue(snapshotWithoutHash),
  };
}
