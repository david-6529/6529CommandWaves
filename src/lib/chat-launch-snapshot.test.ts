import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createChatLaunchSnapshot } from "./chat-launch-snapshot";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";

describe("chat launch snapshot", () => {
  it("publishes the chat launch track without claiming the PR loop is ready", async () => {
    const launchSnapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
    });
    const snapshot = createChatLaunchSnapshot(launchSnapshot);

    expect(snapshot).toMatchObject({
      version: "command-wave-chat-launch-v0.1",
      generatedAt: "2026-06-20T13:00:00.000Z",
      sourceAuditHash: launchSnapshot.auditHash,
      project: {
        id: demoWave.id,
        repoUrl: demoWave.repoUrl,
      },
      setupCheckMode: "shape",
      stateEvidence: launchSnapshot.stateEvidence,
      prLoop: {
        status: launchSnapshot.launchAudit.status,
      },
      verification: {
        chatLaunchStatus: launchSnapshot.launchAudit.chatLaunch.status,
        launchStatus: launchSnapshot.launchAudit.status,
      },
    });
    expect(snapshot.prLoop.status).not.toBe("ready");
  });
});
