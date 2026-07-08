import {
  loadChatLaunchPayload,
  readOptionalJsonUrl,
  resolveVerificationTargetUrl,
  writeJsonResult,
} from "./launch-audit-source";
import { verifyChatLaunchPayload } from "../src/lib/chat-launch-verifier";

async function main() {
  const { payload, sourceUrl } = await loadChatLaunchPayload();
  const stateUrl = resolveVerificationTargetUrl(payload, sourceUrl, "CHAT_LAUNCH_STATE_URL", "commandWaveStateUrl");
  const projectIndexUrl = resolveVerificationTargetUrl(
    payload,
    sourceUrl,
    "CHAT_LAUNCH_PROJECT_INDEX_URL",
    "projectIndexUrl",
  );
  const [commandWaveState, projectIndex] = await Promise.all([
    stateUrl ? readOptionalJsonUrl(stateUrl) : undefined,
    projectIndexUrl ? readOptionalJsonUrl(projectIndexUrl) : undefined,
  ]);
  const result = verifyChatLaunchPayload(payload, {
    commandWaveState,
    requirePublicState: Boolean(stateUrl),
    projectIndex,
    requireProjectIndex: Boolean(projectIndexUrl),
  });

  writeJsonResult(process.env.CHAT_LAUNCH_VERIFICATION_PATH, result);

  console.log(`Chat launch verification: ${result.status}`);
  console.log(`Chat launch status: ${result.chatLaunchStatus}`);
  console.log(`Full PR loop status: ${result.launchStatus}`);
  console.log(`Project: ${result.projectName ?? "unknown"}`);
  console.log(`Generated: ${result.generatedAt ?? "unknown"}`);
  if (result.chatLaunchHash) {
    console.log(`Chat launch hash: ${result.chatLaunchHash}`);
  }
  if (stateUrl) {
    console.log(`Public state target: ${stateUrl}`);
  }
  if (projectIndexUrl) {
    console.log(`Project index target: ${projectIndexUrl}`);
  }

  if (result.nextAction) {
    console.log(`Chat next action: ${result.nextAction.title}`);
    console.log(result.nextAction.detail);
  }

  for (const item of result.checks) {
    console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
  }

  if (result.blockers.length) {
    console.log("Chat launch blockers:");
    for (const item of result.blockers) {
      console.log(`- ${item}`);
    }
  }

  if (result.openItems.length) {
    console.log("Chat launch open items:");
    for (const item of result.openItems) {
      console.log(`- ${item}`);
    }
  }

  if (result.operatorChecklist.length) {
    console.log("Chat launch operator checklist:");
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
