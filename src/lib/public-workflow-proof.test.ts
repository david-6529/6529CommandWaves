import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicWorkflowProof } from "./public-workflow-proof";

const configuredDemoWave = {
  ...demoWave,
  repoUrl: "https://github.com/6529-Collections/6529-hook",
  executions: demoWave.executions.map((execution) => ({
    ...execution,
    artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, "https://github.com/6529-Collections/6529-hook")),
  })),
};

describe("public workflow proof", () => {
  it("does not imply a placeholder repo can run PR work", () => {
    const proof = createPublicWorkflowProof(demoWave);

    expect(proof).toMatchObject({
      summary: "Public proof of the chat, decision, PR, review, and log path for the first hook build.",
      sourceOfTruth: "project chat",
      codeSurface: "GitHub PR",
      blockedCount: 3,
    });
    expect(proof.steps.map((step) => [step.id, step.status])).toEqual([
      ["chat", "ready"],
      ["decision", "ready"],
      ["pr", "blocked"],
      ["review", "blocked"],
      ["log", "blocked"],
    ]);
    expect(proof.steps.find((step) => step.id === "pr")).toMatchObject({
      label: "Pull request",
      detail: "GitHub repo is still a placeholder. Replace it before PR work can run.",
      evidenceUrl: null,
    });
    expect(proof.steps.find((step) => step.id === "log")).toMatchObject({
      label: "Log",
      detail: "Log waits for a real hook repo and reviewed PR.",
      evidenceHash: null,
    });
  });

  it("publishes the ready proof chain when the repo is configured", () => {
    const proof = createPublicWorkflowProof(configuredDemoWave);

    expect(proof.blockedCount).toBe(0);
    expect(proof.readyCount).toBe(5);
    expect(proof.steps.map((step) => [step.id, step.status])).toEqual([
      ["chat", "ready"],
      ["decision", "ready"],
      ["pr", "ready"],
      ["review", "ready"],
      ["log", "ready"],
    ]);
    expect(proof.steps.find((step) => step.id === "decision")?.evidenceUrl).toBe(
      "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
    );
    expect(proof.steps.find((step) => step.id === "pr")?.evidenceUrl).toBe(
      "https://github.com/6529-Collections/6529-hook/pull/12",
    );
    expect(proof.steps.find((step) => step.id === "review")?.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks PR, review, and log proof when the PR link belongs to another repo", () => {
    const proof = createPublicWorkflowProof({
      ...configuredDemoWave,
      executions: configuredDemoWave.executions.map((execution) => ({
        ...execution,
        artifacts: execution.artifacts.map((artifact) =>
          artifact.startsWith("https://github.com/") ? "https://github.com/other-org/other-hook/pull/12" : artifact,
        ),
      })),
    });

    expect(proof.blockedCount).toBe(3);
    expect(proof.steps.map((step) => [step.id, step.status])).toEqual([
      ["chat", "ready"],
      ["decision", "ready"],
      ["pr", "blocked"],
      ["review", "blocked"],
      ["log", "blocked"],
    ]);
    expect(proof.steps.find((step) => step.id === "pr")).toMatchObject({
      detail: "PR record is complete but no PR link matches the configured repo.",
      evidenceUrl: null,
    });
    expect(proof.steps.find((step) => step.id === "review")).toMatchObject({
      detail: "Review waits for a PR link that matches the configured repo.",
    });
  });

  it("does not emit em dash characters", () => {
    expect(JSON.stringify(createPublicWorkflowProof(demoWave))).not.toContain("\u2014");
  });
});
