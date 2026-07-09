import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicProjectSnapshot } from "./public-project-snapshot";
import { hashValue } from "./run-manifest";

const configuredRepo = {
  owner: "builders",
  repo: "hook",
  htmlUrl: "https://github.com/builders/hook",
};

function configuredDemoWave() {
  return {
    ...demoWave,
    repoUrl: configuredRepo.htmlUrl,
    executions: demoWave.executions.map((execution) => ({
      ...execution,
      artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, configuredRepo.htmlUrl)),
    })),
    reviews: demoWave.reviews.map((review) => ({
      ...review,
      proof: review.proof
        ? {
            ...review.proof,
            inputs: {
              ...review.proof.inputs,
              repositoryHash: hashValue(configuredRepo),
            },
          }
        : review.proof,
    })),
  };
}

describe("public project snapshot", () => {
  it("summarizes current hook work without implying the placeholder repo can run code", () => {
    const snapshot = createPublicProjectSnapshot(demoWave);

    expect(snapshot).toMatchObject({
      summary:
        "Builders coordinate this hook in chat. Decisions approve scoped work. GitHub PRs and human review handle code. Now: Draft the non-upgradeable hook scaffold. Next: Keep discussing in chat. Select the hook repo before PR work starts. Repo: not selected. Latest: Builders approved the hook scaffold with 5 yes and 1 no.",
      summaryParagraphs: [
        "Builders coordinate this hook in chat. Decisions approve scoped work. GitHub PRs and human review handle code.",
        "Now: Draft the non-upgradeable hook scaffold. Next: Keep discussing in chat. Select the hook repo before PR work starts. Repo: not selected. Latest: Builders approved the hook scaffold with 5 yes and 1 no.",
      ],
      updatedAt: "2026-06-20T12:40:00.000Z",
      managedBy: {
        summary: "daemon",
        changelog: "daemon",
        pullRequests: "daemon",
        reviewer: "review-agent",
      },
      currentWork: {
        title: "Draft the non-upgradeable hook scaffold",
        status: "complete",
      },
      currentVote: {
        status: "recorded",
        title: "No open vote",
        detail: "Last decision: 5 yes, 1 no.",
        proposalId: "cmd-001",
        yesVotes: 5,
        noVotes: 1,
        decisionUrl: "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
      },
      discussionTopics: [
        {
          id: "proposal-cmd-001",
          title: "Draft hook scaffold",
          status: "repo not selected",
          risk: "high",
        },
        {
          id: "repo-selection",
          title: "Select the pilot GitHub repo",
          status: "needed",
          risk: null,
        },
      ],
      workflow: {
        current: {
          stepId: "build",
          stepLabel: "Build PR",
          status: "waiting",
          statusLabel: "waiting",
          title: "Repo not selected yet",
          detail: "Build PR: Select the hook repo before PR work starts.",
        },
        steps: [
          expect.objectContaining({ id: "project", label: "Project", status: "done" }),
          expect.objectContaining({ id: "proposal", label: "Discuss", status: "done" }),
          expect.objectContaining({ id: "decision", label: "Decide", status: "done" }),
          expect.objectContaining({ id: "build", label: "PR", status: "waiting" }),
          expect.objectContaining({ id: "review", label: "Review", status: "waiting" }),
          expect.objectContaining({ id: "log", label: "Log", status: "waiting" }),
        ],
      },
      chat: {
        id: "project-chat",
        mode: "group_chat",
        label: "Group chat",
        title: "Builder group chat",
        detail:
          "Everyone talks in one thread. daemon listens for important project updates and keeps the summary, decisions, topics, and PR notes current.",
        composerLabel: "Message",
        placeholder: "Message the group.",
        posting: {
          label: "3 messages every 5 min",
          detail: "daemon setting: 3 messages every 5 minutes for each builder.",
          pace: {
            maxPosts: 3,
            windowSeconds: 300,
            identity: "each builder",
            enforcedBy: "daemon",
          },
        },
        parser: {
          agent: "daemon",
          detail: "Send normal messages. daemon parses the group chat for work, decisions, PR links, and review notes.",
        },
      },
      pullRequests: [],
      rules: [
        {
          question: "Who can join?",
          answer: "Ask in chat to join. Access is reviewed manually for now.",
        },
        {
          question: "How do I join?",
          answer: "Connect wallet if you want, then ask to join in chat. A maintainer reviews it for this pilot.",
        },
        {
          question: "How does work start?",
          answer: "Talk in chat. daemon turns clear group agreement into small proposals.",
        },
        {
          question: "Who coordinates?",
          answer: "daemon updates the summary, labels risk, and routes work.",
        },
        {
          question: "How are PRs approved?",
          answer: "Builders record a project decision before PR work starts. Reviewer status is shown on each PR.",
        },
        {
          question: "What about GitHub?",
          answer: "The GitHub repo is a placeholder. Chat can continue. PR work waits until maintainers choose the repo.",
        },
        {
          question: "Who reviews PRs?",
          answer: "Review agent is a placeholder for this phase. Humans still merge.",
        },
        {
          question: "Who merges?",
          answer: "Humans merge, deploy, pay, and change rules. Agents summarize, draft, and check work.",
        },
      ],
      decision: {
        status: "recorded",
        detail: "Builders approved with 5 yes and 1 no.",
      },
      repo: {
        status: "placeholder",
        label: "GitHub repo placeholder. No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.",
        url: null,
      },
      nextStep: {
        label: "Build PR",
        status: "waiting",
        detail: "Select the hook repo before PR work starts.",
      },
    });
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "builders approved",
      message: "Builders approved the hook scaffold with 5 yes and 1 no.",
    });
    expect(snapshot.latestChanges.map((event) => event.label)).not.toContain("review recorded");
    expect(JSON.stringify(snapshot)).not.toContain("\u2014");
  });

  it("surfaces daemon-parsed decision requests without replacing the last recorded vote", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      ledger: [
        {
          id: "evt-decision-needed",
          at: "2026-06-20T12:45:00.000Z",
          actor: "daemon",
          type: "chat_observed",
          message: "ada asked for a decision. Message: Can we vote on the fee cap test plan before opening the PR?",
        },
        ...demoWave.ledger,
      ],
    });

    expect(snapshot.currentVote).toMatchObject({
      status: "recorded",
      title: "No open vote",
      detail: "Last decision: 5 yes, 1 no.",
    });
    expect(snapshot.currentDecisionRequest).toMatchObject({
      id: "chat-evt-decision-needed",
      title: "Vote on the fee cap test plan before opening the PR",
      detail: "Can we vote on the fee cap test plan before opening the PR?",
      status: "needs decision",
      risk: "high",
      at: "2026-06-20T12:45:00.000Z",
    });
    expect(snapshot.discussionTopics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "chat-evt-decision-needed",
          title: "Vote on the fee cap test plan before opening the PR",
          status: "needs decision",
        }),
      ]),
    );
  });

  it("updates the daemon summary from current project state", () => {
    const emptyWave = {
      ...demoWave,
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    };
    const configuredWave = {
      ...demoWave,
      repoUrl: "https://github.com/builders/hook",
    };

    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("Now: Choose one hook change.");
    expect(createPublicProjectSnapshot(emptyWave).updatedAt).toBeNull();
    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("Latest: no project changes recorded yet.");
    expect(createPublicProjectSnapshot(configuredWave).summary).toContain(
      "Repo: connected. Approved changes can enter PR review.",
    );
  });

  it("publishes PR reasons, GitHub links, and agent status when the repo is selected", () => {
    const snapshot = createPublicProjectSnapshot(configuredDemoWave());

    expect(snapshot.repo).toMatchObject({
      status: "configured",
      url: configuredRepo.htmlUrl,
    });
    expect(snapshot.discussionTopics[0]).toMatchObject({
      id: "proposal-cmd-001",
      title: "Draft hook scaffold",
      status: "complete",
    });
    expect(snapshot.pullRequests[0]).toMatchObject({
      id: "cmd-001",
      title: "Draft hook scaffold",
      reason: "Draft the non-upgradeable AMM hook scaffold with fee parameters capped at 100 bps and tests.",
      url: "https://github.com/builders/hook/pull/12",
      daemonSignoff: "signed off",
      reviewerSignoff: "proof recorded",
    });
    expect(snapshot.rules.find((item) => item.question === "What about GitHub?")).toMatchObject({
      answer: "PR work uses the selected GitHub repo. Each PR must link back to the approved work.",
    });
  });

  it("surfaces selected-repo PR links from chat as pending discussion rows", () => {
    const snapshot = createPublicProjectSnapshot({
      ...configuredDemoWave(),
      ledger: [
        {
          id: "evt-chat-pr",
          at: "2026-06-20T13:20:00.000Z",
          actor: "daemon",
          type: "chat_observed",
          message:
            "alice shared a PR link for discussion. Message: I opened https://github.com/builders/hook/pull/45 for fee cap tests.",
        },
        {
          id: "evt-off-repo-pr",
          at: "2026-06-20T13:19:00.000Z",
          actor: "daemon",
          type: "chat_observed",
          message:
            "bob shared a PR link for discussion. Message: I opened https://github.com/other/hook/pull/2 by mistake.",
        },
        ...demoWave.ledger,
      ],
    });

    expect(snapshot.pullRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cmd-001",
          daemonSignoff: "signed off",
          reviewerSignoff: "proof recorded",
        }),
        {
          id: "chat-pr-evt-chat-pr",
          title: "PR #45 discussed in chat",
          reason: "I opened https://github.com/builders/hook/pull/45 for fee cap tests.",
          url: "https://github.com/builders/hook/pull/45",
          daemonSignoff: "needs decision",
          reviewerSignoff: "pending",
        },
      ]),
    );
    expect(JSON.stringify(snapshot.pullRequests)).not.toContain("https://github.com/other/hook/pull/2");
  });

  it("does not treat stale reviewer proof as selected-repo signoff", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      repoUrl: configuredRepo.htmlUrl,
      executions: demoWave.executions.map((execution) => ({
        ...execution,
        artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, configuredRepo.htmlUrl)),
      })),
    });

    expect(snapshot.pullRequests[0]).toMatchObject({
      id: "cmd-001",
      daemonSignoff: "signed off",
      reviewerSignoff: "pending",
    });
  });

  it("moves new proposal activity into the current summary and changelog", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      proposals: [
        {
          ...demoWave.proposals[0],
          id: "cmd-002",
          title: "Add swap fee cap tests",
          status: "ready_for_vote",
        },
        ...demoWave.proposals,
      ],
      ledger: [
        ...demoWave.ledger,
        {
          id: "evt-new-work",
          at: "2026-06-20T13:05:00.000Z",
          actor: "daemon",
          type: "proposal_submitted",
          message: "Submitted cmd-002: Add swap fee cap tests.",
        },
      ],
    });

    expect(snapshot.currentWork).toMatchObject({
      title: "Add swap fee cap tests",
      status: "ready for vote",
    });
    expect(snapshot.summary).toContain("Now: Add swap fee cap tests.");
    expect(snapshot.summary).toContain("Latest: Submitted cmd-002: Add swap fee cap tests.");
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "work proposed",
      message: "Submitted cmd-002: Add swap fee cap tests.",
    });
    expect(snapshot.updatedAt).toBe("2026-06-20T13:05:00.000Z");
  });

  it("moves daemon chat observations into the summary and changelog", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      ledger: [
        ...demoWave.ledger,
        {
          id: "evt-chat",
          at: "2026-06-20T13:10:00.000Z",
          actor: "daemon",
          type: "chat_observed",
          message: "alice suggested work. Message: Can we discuss fee cap tests before anyone opens a PR?",
        },
      ],
    });

    expect(snapshot.summary).toContain("Latest: alice suggested work. Message: Can we discuss fee cap tests before anyone opens a PR?");
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "work suggested",
      message: "alice suggested work. Message: Can we discuss fee cap tests before anyone opens a PR?",
    });
    expect(snapshot.discussionTopics).toEqual([
      expect.objectContaining({
        id: "proposal-cmd-001",
        title: "Draft hook scaffold",
      }),
      {
        id: "chat-evt-chat",
        title: "Fee cap tests before anyone opens a PR",
        detail: "Can we discuss fee cap tests before anyone opens a PR?",
        status: "suggested work",
        risk: "high",
      },
      expect.objectContaining({
        id: "repo-selection",
        title: "Select the pilot GitHub repo",
      }),
    ]);
  });

  it("labels local approval as waiting for a decision link", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
      polls: [{ ...demoWave.polls[0], decision: null }],
      executions: [],
      reviews: [],
    });

    expect(snapshot.decision).toMatchObject({
      status: "decision link needed",
      detail: "Local vote passed. Record the project decision link before PR work starts.",
    });
  });
});
