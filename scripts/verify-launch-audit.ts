import {
  loadLaunchAuditPayload,
  readOptionalJsonUrl,
  resolveVerificationTargetUrl,
  writeJsonResult,
} from "./launch-audit-source";
import { verifyLaunchAuditPayload } from "../src/lib/launch-audit-verifier";

async function main() {
  const { payload, sourceUrl } = await loadLaunchAuditPayload();
  const stateUrl = resolveVerificationTargetUrl(payload, sourceUrl, "LAUNCH_AUDIT_STATE_URL", "commandWaveStateUrl");
  const projectIndexUrl = resolveVerificationTargetUrl(
    payload,
    sourceUrl,
    "LAUNCH_AUDIT_PROJECT_INDEX_URL",
    "projectIndexUrl",
  );
  const [commandWaveState, projectIndex] = await Promise.all([
    stateUrl ? readOptionalJsonUrl(stateUrl) : undefined,
    projectIndexUrl ? readOptionalJsonUrl(projectIndexUrl) : undefined,
  ]);
  const result = verifyLaunchAuditPayload(payload, {
    commandWaveState,
    requirePublicState: Boolean(stateUrl),
    projectIndex,
    requireProjectIndex: Boolean(projectIndexUrl),
  });

  writeJsonResult(process.env.LAUNCH_AUDIT_VERIFICATION_PATH, result);

  console.log(`Launch audit verification: ${result.status}`);
  console.log(`Chat launch status: ${result.chatLaunchStatus}`);
  console.log(`PR loop status: ${result.launchStatus}`);
  console.log(`Project: ${result.projectName ?? "unknown"}`);
  console.log(`Generated: ${result.generatedAt ?? "unknown"}`);
  if (stateUrl) {
    console.log(`Public state target: ${stateUrl}`);
  }
  if (projectIndexUrl) {
    console.log(`Project index target: ${projectIndexUrl}`);
  }

  if (result.nextAction) {
    console.log(`Next action: ${result.nextAction.title}`);
    console.log(result.nextAction.detail);
  }

  if (result.statusDraft) {
    console.log("Status draft:");
    console.log(result.statusDraft);
  }

  if (result.stateEvidence) {
    console.log("State evidence:");
    console.log(`Wave state hash: ${result.stateEvidence.waveStateHash}`);
    console.log(`Rules hash: ${result.stateEvidence.rulesHash}`);
    console.log(
      `Records: ${result.stateEvidence.proposalCount} proposals, ${result.stateEvidence.reviewCount} reviews, ${result.stateEvidence.ledgerEventCount} ledger events.`,
    );
  }

  if (result.publicState) {
    console.log(`State snapshot hash: ${result.publicState.stateHash}`);
  }
  if (result.publicProjectIndex) {
    console.log(`Project index hash: ${result.publicProjectIndex.projectsHash}`);
  }

  for (const item of result.checks) {
    console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
  }

  if (result.chatLaunchBlockers.length) {
    console.log("Chat launch blockers:");
    for (const item of result.chatLaunchBlockers) {
      console.log(`- ${item}`);
    }
  }

  if (result.chatLaunchOpenItems.length) {
    console.log("Chat launch open items:");
    for (const item of result.chatLaunchOpenItems) {
      console.log(`- ${item}`);
    }
  }

  if (result.blockers.length) {
    console.log("PR loop blockers:");
    for (const item of result.blockers) {
      console.log(`- ${item}`);
    }
  }

  if (result.openItems.length) {
    console.log("PR loop open items:");
    for (const item of result.openItems) {
      console.log(`- ${item}`);
    }
  }

  if (result.operatorChecklist.length) {
    console.log("Operator checklist:");
    for (const item of result.operatorChecklist) {
      console.log(item);
    }
  }

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
