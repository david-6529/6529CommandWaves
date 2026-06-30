import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCommandWaveStoreForTests,
  getCommandWave,
  replaceCommandWave,
  resetCommandWave,
  submitCommandProposal,
} from "./command-wave-store";
import { demoWave } from "./demo-wave";
import { deletePersistedCommandWave, getCommandWaveStoreMode, savePersistedCommandWave } from "./command-wave-persistence";

describe("command wave persistence", () => {
  const previousStoreMode = process.env.COMMAND_WAVE_STORE;
  const storeFile = ".data/command-wave-test.json";

  beforeEach(async () => {
    process.env.COMMAND_WAVE_STORE = "file";
    clearCommandWaveStoreForTests();
    await deletePersistedCommandWave();
  });

  afterEach(async () => {
    clearCommandWaveStoreForTests();
    await deletePersistedCommandWave();

    if (previousStoreMode === undefined) {
      delete process.env.COMMAND_WAVE_STORE;
    } else {
      process.env.COMMAND_WAVE_STORE = previousStoreMode;
    }

  });

  it("persists command wave mutations and reloads them after memory is cleared", async () => {
    expect(getCommandWaveStoreMode()).toBe("file");

    await resetCommandWave();
    const updated = await submitCommandProposal({
      title: "Persist me",
      proposer: "tester",
      kind: "draft_response",
      prompt: "Draft a short update.",
      spec: "Draft only.",
      budgetUsd: 0,
    });

    expect(updated.proposals[0]).toMatchObject({
      id: "cmd-002",
      title: "Persist me",
      status: "approved",
    });
    expect(existsSync(storeFile)).toBe(true);
    expect(JSON.parse(readFileSync(storeFile, "utf8")).proposals[0]).toMatchObject({
      id: "cmd-002",
      title: "Persist me",
    });

    clearCommandWaveStoreForTests();

    expect((await getCommandWave()).proposals[0]).toMatchObject({
      id: "cmd-002",
      title: "Persist me",
    });
  });

  it("migrates the old built-in demo state to the hook project demo", async () => {
    await replaceCommandWave({
      ...demoWave,
      id: "cw-6529-shipyard",
      waveUrl: "https://6529.io/waves/demo-command-wave",
      repoUrl: "https://github.com/6529-Collections/example-command-wave",
    });

    clearCommandWaveStoreForTests();

    expect(await getCommandWave()).toMatchObject({
      id: "cw-6529-hook-builder",
      waveUrl: "https://6529.io/waves/6529-hook-builder",
      repoUrl: "https://github.com/6529-Collections/6529-hook",
    });
  });

  it("refreshes stale built-in hook demo records without changing custom activity", async () => {
    await replaceCommandWave({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [
        {
          proposalId: "cmd-001",
          harness: "codex",
          status: "complete",
          summary: "Mock execution opened a PR with copy-only changes bound to the approved spec.",
          artifacts: ["PR #12"],
        },
      ],
      ledger: [
        {
          id: "evt-001",
          at: "2026-06-20T12:00:00.000Z",
          actor: "Setup",
          type: "wave_created",
          message: "Created Command Waves Demo and attached 6529 wave + GitHub repo.",
        },
      ],
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.executions[0]?.summary).toBe(demoWave.executions[0]?.summary);
    expect(wave.proposals[0]?.status).toBe("complete");
    expect(wave.ledger[0]?.message).toBe("Created the 6529 hook project and attached the 6529 room and code repo.");
  });

  it("normalizes old hook-room copy without replacing custom activity", async () => {
    await replaceCommandWave({
      ...demoWave,
      name: "6529 Hook Builder",
      gates: [
        "Builder wave allowlist for phase 1 (manual note only, not enforced by this app)",
        "REP or TDH gates are planned, not enforced here",
        "AI contribution scores are reports, not permissions",
      ],
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      polls: [
        {
          ...demoWave.polls[0],
          decision: demoWave.polls[0].decision
            ? {
                ...demoWave.polls[0].decision,
                summary: "Builder wave approved cmd-001 with 5 yes and 1 no.",
              }
            : demoWave.polls[0].decision,
        },
      ],
      executions: [
        {
          proposalId: "cmd-001",
          harness: "codex",
          status: "complete",
          summary: "Local agent mock opened a deterministic PR artifact for the approved command.",
          artifacts: ["PR #99"],
        },
      ],
      reviews: [
        {
          proposalId: "cmd-001",
          status: "pass",
          checks: ["Run manifest matches approved command, rules hash, permissions, and budget."],
          summary: "Reviewer mock passed the execution against the approved command.",
        },
      ],
      ledger: [
        {
          id: "evt-custom",
          at: "2026-06-20T12:55:00.000Z",
          actor: "Wave Poll",
          type: "poll_passed",
          message: "Builder wave approved custom PR #99.",
        },
      ],
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.name).toBe("6529 Hook");
    expect(wave.gates).toContain("Manual builder review for phase 1");
    expect(wave.gates).toContain("AI contribution report scores are not permissions");
    expect(wave.polls[0]?.decision?.summary).toBe("Room approved cmd-001 with 5 yes and 1 no.");
    expect(wave.proposals[0]?.status).toBe("approved");
    expect(wave.executions[0]?.summary).toBe("Agent adapter opened a deterministic PR artifact for the approved work.");
    expect(wave.executions[0]?.artifacts).toEqual(["PR #99"]);
    expect(wave.reviews[0]?.summary).toBe("Reviewer adapter passed the execution against the approved work.");
    expect(wave.reviews[0]?.checks).toEqual(["Run manifest matches approved work, rules hash, permissions, and budget."]);
    expect(wave.ledger[0]).toMatchObject({
      actor: "Decision",
      message: "Room approved custom PR #99.",
    });
  });

  it("refreshes old complete hook demo records that lack deterministic evidence", async () => {
    await replaceCommandWave({
      ...demoWave,
      executions: [
        {
          proposalId: "cmd-001",
          harness: "codex",
          status: "complete",
          summary: "Mock execution opened a PR with the hook scaffold and parameter-bound tests bound to the approved spec.",
          artifacts: ["PR #12", "commit abc123", "forge test passed"],
        },
      ],
      reviews: [
        {
          proposalId: "cmd-001",
          status: "pass",
          checks: ["Matched approved hook scope"],
          summary: "Review passed. The work matched the vote and stayed inside the approved non-upgradeable hook scope.",
        },
      ],
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.executions[0]?.artifacts.some((artifact) => artifact.startsWith("run-manifest:"))).toBe(true);
    expect(wave.executions[0]?.artifacts.some((artifact) => artifact.startsWith("agent-handoff:"))).toBe(true);
    expect(wave.reviews[0]?.proof?.attestationHash).toHaveLength(64);
  });

  it("refreshes old built-in hook demo records that lack decision receipts", async () => {
    await replaceCommandWave({
      ...demoWave,
      proposals: [
        {
          ...demoWave.proposals[0],
          prompt: "Use Codex to draft a non-upgradeable 6529 hook scaffold with bounded fee parameters and tests.",
          spec:
            "Smart contract work only. No proxy, no delegatecall, no deploy script, no payments, and no governance changes. Include tests for parameter bounds.",
        },
      ],
      polls: [{ ...demoWave.polls[0], decision: null }],
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.proposals[0]?.prompt).toContain("100 bps");
    expect(wave.proposals[0]?.spec).toContain("100 bps fee cap");
    expect(wave.polls[0]?.decision).toMatchObject({
      dropId: "drop-cmd-001-approval",
    });
  });

  it("parks future command rules loaded from older persisted state", async () => {
    await savePersistedCommandWave({
      ...demoWave,
      rules: {
        ...demoWave.rules,
        rulesByKind: {
          ...demoWave.rules.rulesByKind,
          run_script: {
            ...demoWave.rules.rulesByKind.run_script,
            mode: "poll",
            reason: "Scripts can mutate local or remote state.",
          },
          deploy: {
            ...demoWave.rules.rulesByKind.deploy,
            mode: "poll",
            reason: "Deploys affect production users.",
          },
          spend_money: {
            ...demoWave.rules.rulesByKind.spend_money,
            mode: "poll",
            reason: "Spending needs explicit budget consent.",
          },
          change_rules: {
            ...demoWave.rules.rulesByKind.change_rules,
            mode: "poll",
            reason: "Changing rules changes the governance system itself.",
          },
        },
      },
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.rules.rulesByKind.run_script).toMatchObject({ mode: "blocked", reason: "Script execution is parked in phase 1." });
    expect(wave.rules.rulesByKind.deploy).toMatchObject({ mode: "blocked", reason: "Deploys stay human-controlled outside this app." });
    expect(wave.rules.rulesByKind.spend_money).toMatchObject({ mode: "blocked", reason: "Spending stays outside phase 1." });
    expect(wave.rules.rulesByKind.change_rules).toMatchObject({ mode: "blocked", reason: "Rule changes stay outside phase 1." });
  });
});
