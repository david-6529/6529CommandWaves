import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicWorkflowProof } from "./public-workflow-proof";
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

describe("public workflow proof", () => {
  it("does not imply a placeholder repo can run PR work", () => {
    const proof = createPublicWorkflowProof(demoWave);

    expect(proof).toMatchObject({
      summary: "Public proof of the chat, decision, PR, review, and log path for the first hook build.",
      sourceOfTruth: "project chat",
      codeSurface: "GitHub PR",
      blockedCount: 0,
    });
    expect(proof.steps.map((step) => [step.id, step.status])).toEqual([
      ["chat", "ready"],
      ["decision", "ready"],
      ["pr", "needed"],
      ["review", "needed"],
      ["log", "needed"],
    ]);
    expect(proof.steps.find((step) => step.id === "pr")).toMatchObject({
      label: "Pull request",
      detail: "GitHub repo is a placeholder. Select it before PR work can run.",
      evidenceUrl: null,
    });
    expect(proof.steps.find((step) => step.id === "log")).toMatchObject({
      label: "Log",
      detail: "Log waits for the selected hook repo and reviewed PR.",
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

  it("blocks review and log proof when review proof is not bound to the configured repo", () => {
    const proof = createPublicWorkflowProof({
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

    expect(proof.blockedCount).toBe(1);
    expect(proof.steps.map((step) => [step.id, step.status])).toEqual([
      ["chat", "ready"],
      ["decision", "ready"],
      ["pr", "ready"],
      ["review", "blocked"],
      ["log", "needed"],
    ]);
    expect(proof.steps.find((step) => step.id === "review")).toMatchObject({
      detail: "Review proof must be bound to the configured repo.",
    });
    expect(proof.steps.find((step) => step.id === "log")).toMatchObject({
      detail: "Log waits for review proof bound to the configured repo.",
    });
  });

  it("does not emit em dash characters", () => {
    expect(JSON.stringify(createPublicWorkflowProof(demoWave))).not.toContain("\u2014");
  });
});
