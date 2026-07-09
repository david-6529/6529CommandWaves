import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createCommandWaveStateHash } from "./command-wave-state-hash";
import {
  commandWaveStateUrlFromEnv,
  createCommandWaveStateSnapshot,
  createPublicCommandWave,
  publicCommandWaveHash,
} from "./command-wave-state";

describe("command wave state snapshot", () => {
  it("publishes the current wave in guardian-readable shape", () => {
    const snapshot = createCommandWaveStateSnapshot(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(snapshot).toMatchObject({
      version: "command-wave-state-v0.1",
      generatedAt: "2026-06-21T12:00:00.000Z",
      wave: createPublicCommandWave(demoWave),
      projectSnapshot: {
        managedBy: {
          summary: "daemon",
          changelog: "daemon",
          pullRequests: "daemon",
          reviewer: "review-agent",
        },
        currentWork: {
          title: "Draft the non-upgradeable hook scaffold",
        },
        currentVote: {
          status: "recorded",
          proposalId: "cmd-001",
          yesVotes: 5,
          noVotes: 1,
        },
        discussionTopics: [
          {
            id: "proposal-cmd-001",
            title: "Draft hook scaffold",
          },
          {
            id: "repo-selection",
            title: "Select the pilot GitHub repo",
          },
        ],
        workflow: {
          current: expect.objectContaining({
            stepId: "build",
            detail: "Build PR: Select the hook repo before PR work starts.",
          }),
          steps: expect.arrayContaining([
            expect.objectContaining({ id: "project", label: "Project", status: "done" }),
            expect.objectContaining({ id: "build", label: "PR", status: "waiting" }),
          ]),
        },
        chat: {
          id: "project-chat",
          mode: "group_chat",
          label: "Group chat",
          posting: {
            pace: {
              maxPosts: 3,
              windowSeconds: 300,
              enforcedBy: "daemon",
            },
          },
          parser: {
            agent: "daemon",
            detail: "Write like a normal group chat. daemon reads the thread for work, votes, reviews, and PR links.",
          },
        },
        pullRequests: [],
        rules: expect.arrayContaining([
          {
            question: "Who can join?",
            answer: "Ask in chat to join. Access is reviewed manually for now.",
          },
          {
            question: "How are PRs approved?",
            answer: "Builders record a project decision before PR work starts. Reviewer status is shown on each PR.",
          },
        ]),
        updatedAt: "2026-06-20T12:40:00.000Z",
        repo: {
          status: "placeholder",
        },
        nextStep: {
          label: "Build PR",
        },
      },
      hookSafety: {
        immutableDefault: true,
        summary: "Hook contracts are immutable by default. Parameter changes need explicit caps and bound-focused tests.",
      },
      workflowProof: {
        summary: "Public proof of the chat, decision, PR, review, and log path for the first hook build.",
        sourceOfTruth: "project chat",
        codeSurface: "GitHub PR",
        blockedCount: 0,
      },
      access: {
        label: "manual review",
        summary: "Ask in chat to join. Access is reviewed manually for now.",
      },
      productContract: {
        name: "Decentralized Coding: Beta",
        purpose: "A simple way for people and agents to build in public",
        workflow: ["Choose project", "Discuss in chat", "Record decision", "Build PR", "Review", "Log result"],
        publicSurfaces: ["Project chat", "GitHub repo placeholder until selected", "Build audit log"],
      },
      authorityBoundary: {
        phase: "first_public_hook_build",
        socialSourceOfTruth: "project chat",
        codeSurface: "GitHub PR",
        humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
        appDoesNot: [
          "Auto-merge PRs",
          "Deploy contracts",
          "Move funds",
          "Grant reputation, token weight, payouts, permissions, or merge rights from contribution scores",
        ],
        accessStatus: "Reputation, token, holder, allowlist, and QnA access notes are advisory until wired and verified.",
      },
      agents: {
        orchestrator: {
          handle: "daemon",
          accountType: "6529 account",
          status: "active",
        },
        reviewer: {
          status: "placeholder",
        },
        githubRepo: {
          status: "placeholder",
          label: "GitHub repo placeholder",
          configuredUrl: null,
          nextStep: "Choose the pilot repo before creating or reviewing PRs.",
        },
      },
      reports: {
        contribution: {
          mode: "informational",
          method: {
            id: "visible_activity_v0",
            label: "Visible activity report",
            authority: "Informational only",
          },
          generatedAt: "2026-06-21T12:00:00.000Z",
        },
      },
      guardian: {
        envVar: "COMMAND_WAVE_STATE_URL",
        expectedPayload: "command-wave-state-v0.1 snapshot",
      },
    });
    const { stateHash, ...snapshotWithoutStateHash } = snapshot;

    expect(stateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stateHash).toBe(createCommandWaveStateHash(snapshotWithoutStateHash));
    expect(snapshot.wave.repoUrl).toBeNull();
    expect(snapshot.wave.executions).toEqual([]);
    expect(snapshot.wave.reviews).toEqual([]);
    expect(snapshot.wave.ledger.map((event) => event.type)).not.toContain("execution_logged");
    expect(snapshot.wave.ledger.map((event) => event.type)).not.toContain("guardian_reviewed");
    expect(snapshot.wave.proposals[0]?.status).toBe("approved");
    expect(snapshot.waveStateHash).toBe(publicCommandWaveHash(demoWave));
    expect(snapshot.projectSnapshot.latestChanges[0]?.label).toBe("builders approved");
    expect(snapshot.projectSnapshot.summary).toContain(
      "Next: Keep discussing in chat. Select the hook repo before PR work starts.",
    );
    expect(snapshot.projectSnapshot.currentVote.detail).toBe("Last decision: 5 yes, 1 no.");
    expect(snapshot.projectSnapshot.discussionTopics.map((topic) => topic.title)).toContain("Select the pilot GitHub repo");
    expect(snapshot.hookSafety.parameterPolicy.join(" ")).toContain("bound-focused tests");
    expect(snapshot.hookSafety.blockedInPhaseOne.join(" ")).toContain("delegatecall");
    expect(snapshot.workflowProof.steps.map((step) => [step.id, step.status])).toEqual([
      ["chat", "needed"],
      ["decision", "ready"],
      ["pr", "needed"],
      ["review", "needed"],
      ["log", "needed"],
    ]);
    expect(snapshot.workflowProof.steps.find((step) => step.id === "chat")).toMatchObject({
      detail: "Project chat is connected. First daemon-parsed builder message is still needed.",
      evidenceUrl: "https://6529.io/waves/6529-hook-builder",
      evidenceHash: null,
    });
    expect(snapshot.access.notes).toContain("Manual builder review for phase 1");
    expect(snapshot.productContract.firstPhaseLimits.join(" ")).toContain("Contribution reports are evidence");
    expect(snapshot.reports.contribution.notes.join(" ")).toContain("not a permission system");
    expect(snapshot.reports.contribution.contributors[0]).toHaveProperty("chatPosts");
    expect(JSON.stringify(snapshot.reports.contribution)).toContain("chatPosts");
    expect(JSON.stringify(snapshot.reports.contribution)).not.toContain("roomPosts");
    expect(snapshot.authorityBoundary.agentLimits.join(" ")).toContain("Reviewer checks are evidence");
    expect(snapshot.authorityBoundary).not.toHaveProperty("gateStatus");
    expect(JSON.stringify(snapshot)).not.toContain("\u2014");
  });

  it("builds the public state URL from env", () => {
    expect(
      commandWaveStateUrlFromEnv({
        NEXT_PUBLIC_APP_URL: "https://hooks.example/",
      }),
    ).toBe("https://hooks.example/api/command-wave/state");
    expect(
      commandWaveStateUrlFromEnv({
        COMMAND_WAVE_STATE_URL: "https://state.example/wave.json",
        NEXT_PUBLIC_APP_URL: "https://hooks.example",
      }),
    ).toBe("https://state.example/wave.json");
    expect(commandWaveStateUrlFromEnv({})).toBeNull();
  });

  it("ignores placeholder state URLs in production", () => {
    expect(
      commandWaveStateUrlFromEnv({
        NODE_ENV: "production",
        COMMAND_WAVE_STATE_URL: "https://your-app.example/api/command-wave/state",
        NEXT_PUBLIC_APP_URL: "https://your-app.example",
      }),
    ).toBeNull();
  });
});
