import { describe, expect, it } from "vitest";
import { githubRepoPlaceholder } from "./agent-identities";
import { createCommandWaveStateSnapshot } from "./command-wave-state";
import { createCommandWaveStateHash } from "./command-wave-state-hash";
import { demoWave } from "./demo-wave";
import { createChatLaunchSnapshot } from "./chat-launch-snapshot";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { createHookProjectIndex } from "./hook-project-index";
import { verifyChatLaunchAuditPayload, verifyChatLaunchPayload } from "./chat-launch-verifier";
import type { SetupValidation } from "./setup-validation";

const chatReadyEnv = {
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  DATABASE_URL: "postgresql://command_waves:strong-password@db.internal:5432/command_waves",
  ADMIN_API_KEY: "strong-admin-key-for-launch",
  COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/6529-hook-builder",
  COMMAND_WAVE_INITIAL_REPO_URL: githubRepoPlaceholder.url,
  "6529_MOCK_MODE": "false",
  NODE_ENV: "production",
  COMMAND_WAVE_STORE: "postgres",
  "6529_BOT_BEARER_TOKEN": "6529-live-bot-token",
  "6529_BOT_WALLET_ADDRESS": "0x1234567890abcdef1234567890abcdef12345678",
};

const chatReadySetupValidation: SetupValidation = {
  waveId: "6529-hook-builder",
  repo: {
    owner: "your-org",
    repo: "your-hook-repo",
    htmlUrl: githubRepoPlaceholder.url,
  },
  repoMetadata: null,
  repoRequiredFiles: [],
  checks: [
    { id: "wave_reachable", label: "Wave reachable", status: "pass", message: "Live 6529 wave is reachable." },
    {
      id: "repo_placeholder",
      label: "GitHub repo placeholder",
      status: "warn",
      message: "GitHub repo is a placeholder. PR work stays blocked until maintainers choose the repo.",
    },
  ],
  canSave: true,
  canRunCode: false,
};

describe("chat launch verifier", () => {
  it("passes when the project chat is ready and the GitHub repo is still a placeholder", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
      checkSetupRemote: true,
      setupValidation: chatReadySetupValidation,
    });
    const result = verifyChatLaunchAuditPayload(snapshot);

    expect(snapshot.launchAudit.status).not.toBe("ready");
    expect(snapshot.launchAudit.chatLaunch.status).toBe("ready");
    expect(result.status).toBe("pass");
    expect(result.chatLaunchStatus).toBe("ready");
    expect(result.launchStatus).not.toBe("ready");
    expect(result.chatLaunchHash).toBeNull();
    expect(result.nextAction?.title).toBe("Open project chat");
    expect(result.operatorChecklist).toEqual([]);
    expect(result.checks.find((item) => item.id === "launch_status")).toBeUndefined();
    expect(result.checks.find((item) => item.id === "chat_launch_ready")).toMatchObject({
      status: "pass",
    });
  });

  it("passes direct chat launch endpoint payloads", async () => {
    const launchSnapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
      checkSetupRemote: true,
      setupValidation: chatReadySetupValidation,
    });
    const chatSnapshot = createChatLaunchSnapshot(launchSnapshot);
    const result = verifyChatLaunchPayload(chatSnapshot, {
      commandWaveState: createCommandWaveStateSnapshot(demoWave, {
        generatedAt: "2026-06-20T13:01:00.000Z",
      }),
      projectIndex: createHookProjectIndex(demoWave, {
        generatedAt: "2026-06-20T13:02:00.000Z",
      }),
    });

    expect(result.status).toBe("pass");
    expect(result.chatLaunchStatus).toBe("ready");
    expect(result.launchStatus).not.toBe("ready");
    expect(result.statusDraft).toBeNull();
    expect(result.auditHash).toBe(launchSnapshot.auditHash);
    expect(result.chatLaunchHash).toBe(chatSnapshot.chatLaunchHash);
    expect(result.operatorChecklist).toEqual([]);
    expect(result.checks.find((item) => item.id === "chat_launch_hash")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "remote_setup")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "public_state_endpoint")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "project_index_endpoint")).toMatchObject({
      status: "pass",
    });
  });

  it("fails direct chat launch endpoint payloads when their hash is stale", async () => {
    const launchSnapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
      checkSetupRemote: true,
      setupValidation: chatReadySetupValidation,
    });
    const chatSnapshot = createChatLaunchSnapshot(launchSnapshot);
    const result = verifyChatLaunchPayload({
      ...chatSnapshot,
      chatLaunchHash: "0".repeat(64),
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "chat_launch_hash")).toMatchObject({
      status: "fail",
      message: "Chat launch payload must publish a valid hash for this payload.",
    });
  });

  it("fails direct chat launch payloads when fetched state does not match", async () => {
    const launchSnapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
      checkSetupRemote: true,
      setupValidation: chatReadySetupValidation,
    });
    const mismatchedWave = {
      ...demoWave,
      name: "Other hook",
    };
    const result = verifyChatLaunchPayload(createChatLaunchSnapshot(launchSnapshot), {
      commandWaveState: createCommandWaveStateSnapshot(mismatchedWave, {
        generatedAt: "2026-06-20T13:01:00.000Z",
      }),
      requirePublicState: true,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "public_state_endpoint")).toMatchObject({
      status: "fail",
    });
  });

  it("fails direct chat launch payloads when public state omits group chat settings", async () => {
    const launchSnapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
      checkSetupRemote: true,
      setupValidation: chatReadySetupValidation,
    });
    const publicState = createCommandWaveStateSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:01:00.000Z",
    });
    const brokenState = {
      ...publicState,
      projectSnapshot: {
        ...publicState.projectSnapshot,
        chat: {
          ...publicState.projectSnapshot.chat,
          mode: "status_feed",
        },
      },
    };
    const result = verifyChatLaunchPayload(createChatLaunchSnapshot(launchSnapshot), {
      commandWaveState: {
        ...brokenState,
        stateHash: createCommandWaveStateHash(brokenState),
      },
      requirePublicState: true,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "public_state_endpoint")).toMatchObject({
      status: "fail",
      message: "Public command-wave state must match the chat launch audit evidence.",
    });
  });

  it("fails when the chat launch track is blocked", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: {},
      checkSetupRemote: true,
      setupValidation: chatReadySetupValidation,
    });
    const result = verifyChatLaunchAuditPayload(snapshot);

    expect(result.status).toBe("fail");
    expect(result.chatLaunchStatus).toBe("blocked");
    expect(result.operatorChecklist).toContain("- Set a strong ADMIN_API_KEY before public launch.");
    expect(result.operatorChecklist).toContain("- Set NEXT_PUBLIC_APP_URL to the deployed HTTPS app URL.");
    expect(result.operatorChecklist).toContain("- Set COMMAND_WAVE_INITIAL_WAVE_URL to the first project chat.");
    expect(result.operatorChecklist).toContain("- Set 6529_BOT_BEARER_TOKEN and 6529_BOT_WALLET_ADDRESS for daemon chat posting.");
    expect(result.checks.find((item) => item.id === "chat_launch_ready")).toMatchObject({
      status: "fail",
      message: "Project chat launch is blocked.",
    });
  });

  it("prints a specific operator checklist item before setup is checked", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
    });
    const result = verifyChatLaunchAuditPayload(snapshot);

    expect(result.status).toBe("fail");
    expect(result.operatorChecklist).toContain("- Run the remote project chat setup check before inviting builders.");
    expect(result.operatorChecklist.join("\n")).not.toContain("Resolve Project chat check");
  });

  it("fails until remote setup checks are run", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: chatReadyEnv,
      setupValidation: chatReadySetupValidation,
    });
    const result = verifyChatLaunchAuditPayload(snapshot);

    expect(snapshot.launchAudit.chatLaunch.status).toBe("ready");
    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "remote_setup")).toMatchObject({
      status: "fail",
    });
  });
});
