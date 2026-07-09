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
        },
        {
          id: "repo-selection",
          title: "Select the pilot GitHub repo",
          status: "needed",
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
        title: "Group chat",
        detail:
          "Use it like a normal group chat. Ask questions, suggest work, paste PRs, and daemon will parse what matters.",
        composerLabel: "Message the group",
        placeholder: "Ask a question, suggest work, paste a PR, or share context.",
        posting: {
          label: "daemon managed pace",
          detail: "Direct posting is limited to 3 messages per 5 minutes for each builder identity.",
          pace: {
            maxPosts: 3,
            windowSeconds: 300,
            identity: "builder identity",
            enforcedBy: "daemon",
          },
        },
        parser: {
          agent: "daemon",
          detail: "Builders write normally. daemon reads the shared thread and updates summaries, votes, and PR work.",
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
          answer: "Connect wallet if you want, then request access in chat. A maintainer reviews it for this pilot.",
        },
        {
          question: "How does work start?",
          answer: "Post in chat. daemon parses the discussion and turns clear agreement into small proposals.",
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
