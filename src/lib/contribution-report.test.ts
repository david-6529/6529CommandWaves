import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createContributionReport, createContributionReportDraft, reportPointLabel } from "./contribution-report";
import { hashValue } from "./run-manifest";

const configuredRepo = {
  owner: "6529-Collections",
  repo: "6529-hook",
  htmlUrl: "https://github.com/6529-Collections/6529-hook",
};

const configuredDemoWave = {
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

describe("contribution report", () => {
  it("formats report point labels cleanly", () => {
    expect(reportPointLabel(1)).toBe("1 report point");
    expect(reportPointLabel(2)).toBe("2 report points");
  });

  it("summarizes visible activity without granting authority", () => {
    const report = createContributionReport(configuredDemoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(report).toMatchObject({
      mode: "informational",
      method: {
        id: "visible_activity_v0",
        label: "Visible activity report",
        authority: "Informational only",
      },
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    expect(report.notes.join(" ")).toContain("Report scores are an AI-readable activity report");
    expect(report.notes.join(" ")).toContain("Reputation, token weight, payouts, and merge rights");
    expect(report.notes.join(" ")).toContain("chat post, PR, review, and ledger records");
    expect(report.coverage.included).toContain("Work proposals stored by this app.");
    expect(report.coverage.included).toContain("Chat posts pulled into this app.");
    expect(report.coverage.included).toContain("Recorded GitHub PR links and repo-bound Guardian review proof.");
    expect(report.coverage.notIncluded).toContain("Live chat posts that have not been pulled into app state.");
    expect(report.coverage.notIncluded).toContain("Manual payments, reputation, token weight, off-app agreements, or private coordination.");
    expect(report.scoringRubric).toEqual([
      "Complete proposal: 6 report points.",
      "Reviewing proposal: 4 report points.",
      "Other proposal: 3 report points.",
      "Recorded PR linked to a proposal: 2 report points.",
      "Repo-bound Guardian review proof linked to a proposal: 2 report points.",
      "Project decision link: 2 report points.",
      "Vote or attributed activity log event: 1 report point.",
      "Chat post pulled into app: 1 report point.",
    ]);
    expect(report.evidence).toContain("1 GitHub PR link");
    expect(report.evidence).toContain("1 Guardian review proof");
    expect(report.contributors[0]).toMatchObject({
      identity: "david",
      score: 14,
      scoreBasis: [
        "Proposal work: 6 report points",
        "PR evidence: 2 report points",
        "Review proof: 2 report points",
        "Decision links: 2 report points",
        "Votes: 1 report point",
        "Activity log: 1 report point",
      ],
      proposals: 1,
      pullRequests: 1,
      reviewProofs: 1,
      decisions: 1,
    });
    expect(report.contributors[0].rationale).toContain("Linked approved work to a GitHub PR");
    expect(report.contributors[0].rationale).toContain("Received repo-bound Guardian review proof");
    expect(report.contributors[0].rationale).toContain("Recorded project decision link");
    expect(report.contributors.some((contributor) => contributor.votes > 0)).toBe(true);
    expect(report.contributors.some((contributor) => contributor.identity === "Decision")).toBe(false);
  });

  it("does not count stale placeholder repo PR and review evidence", () => {
    const report = createContributionReport(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(report.evidence).not.toContain("1 GitHub PR link");
    expect(report.evidence).not.toContain("1 Guardian review proof");
    expect(report.contributors[0]).toMatchObject({
      pullRequests: 0,
      reviewProofs: 0,
    });
    expect(report.notes.join(" ")).toContain("not a permission system");
  });

  it("does not count review proof that is not bound to the configured repo", () => {
    const report = createContributionReport({
      ...configuredDemoWave,
      reviews: configuredDemoWave.reviews.map((review) => ({
        ...review,
        proof: review.proof
          ? {
              ...review.proof,
              inputs: {
                ...review.proof.inputs,
                repositoryHash: undefined,
              },
            }
          : review.proof,
      })),
    });

    expect(report.evidence).toContain("1 GitHub PR link");
    expect(report.evidence).not.toContain("1 Guardian review proof");
    expect(report.contributors[0]).toMatchObject({
      pullRequests: 1,
      reviewProofs: 0,
    });
  });

  it("defaults generatedAt to the newest ledger event", () => {
    const report = createContributionReport(demoWave);

    expect(report.generatedAt).toBe("2026-06-20T12:50:00.000Z");
  });

  it("reports no records before app activity exists", () => {
    const report = createContributionReport({
      ...demoWave,
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(report.summary).toBe("No contributor activity has been recorded yet.");
    expect(report.evidence).toEqual(["No app records yet."]);
  });

  it("includes chat posts pulled into the app without granting authority", () => {
    const report = createContributionReport(demoWave, {
      chatPosts: [
        {
          author: "chat-builder",
          preview: "I can review the next hook PR.",
          createdAt: "2026-06-21T12:00:00.000Z",
        },
        {
          author: "wave-poll",
          preview: "Decision passed.",
          createdAt: "2026-06-21T12:01:00.000Z",
        },
      ],
    });

    expect(report.generatedAt).toBe("2026-06-21T12:00:00.000Z");
    expect(report.evidence).toContain("1 chat post");
    expect(report.contributors.find((contributor) => contributor.identity === "chat-builder")).toMatchObject({
      score: 1,
      scoreBasis: ["Chat posts: 1 report point"],
      chatPosts: 1,
    });
    expect(report.contributors.some((contributor) => contributor.identity === "wave-poll")).toBe(false);
    expect(report.notes.join(" ")).toContain("not a permission system");
  });

  it("does not count daemon or system authors as builder contribution", () => {
    const report = createContributionReport(demoWave, {
      chatPosts: [
        { author: "daemon", preview: "Which GitHub repo should hold this hook before PR work starts?" },
        { author: "reviewer-agent", preview: "Review placeholder note." },
        { author: "wave-poll", preview: "Decision passed." },
        { author: "chat-builder", preview: "I can review the next hook PR." },
      ],
    });

    expect(report.contributors.some((contributor) => contributor.identity === "daemon")).toBe(false);
    expect(report.contributors.some((contributor) => contributor.identity === "reviewer-agent")).toBe(false);
    expect(report.contributors.some((contributor) => contributor.identity === "wave-poll")).toBe(false);
    expect(report.contributors.find((contributor) => contributor.identity === "chat-builder")).toMatchObject({
      score: 1,
      scoreBasis: ["Chat posts: 1 report point"],
      chatPosts: 1,
    });
  });

  it("creates a copyable report draft without granting authority", () => {
    const draft = createContributionReportDraft(configuredDemoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
      limit: 2,
    });

    expect(draft).toContain("Project contribution report");
    expect(draft).toContain("Generated: 2026-06-21T12:00:00.000Z");
    expect(draft).toContain("Method: Visible activity report (visible_activity_v0), Informational only.");
    expect(draft).toContain("Records:");
    expect(draft).toContain("- 1 GitHub PR link");
    expect(draft).toContain("Coverage included:");
    expect(draft).toContain("- Work proposals stored by this app.");
    expect(draft).toContain("- Chat posts pulled into this app.");
    expect(draft).toContain("Not included:");
    expect(draft).toContain("- Live chat posts that have not been pulled into app state.");
    expect(draft).toContain("Contributors:");
    expect(draft).toContain("- david: report score");
    expect(draft).toContain("Proposal work: 6 report points");
    expect(draft).toContain("PR evidence: 2 report points");
    expect(draft).toContain("Review proof: 2 report points");
    expect(draft).toContain("1 PR");
    expect(draft).toContain("1 review proof");
    expect(draft).toContain("Decision links: 2 report points");
    expect(draft).toContain("Report scores are an AI-readable activity report, not a permission system.");
    expect(draft).toContain("Reputation, token weight, payouts, and merge rights must use separate human-approved rules.");
    expect(draft).not.toContain("\u2014");
  });
});
