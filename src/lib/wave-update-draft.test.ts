import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createWaveUpdateDraft } from "./wave-update-draft";
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

describe("wave update draft", () => {
  it("summarizes the current hook project without claiming live posting or authority", () => {
    const proposal = demoWave.proposals[0];
    const draft = createWaveUpdateDraft({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
      execution: demoWave.executions[0],
      review: demoWave.reviews[0],
      verificationTargets: {
        verificationManifestUrl: "https://hooks.example/api/command-wave/verification/manifest",
        setupProofUrl: "https://hooks.example/api/command-wave/setup/proof",
        projectIndexUrl: "https://hooks.example/api/command-wave/projects",
        commandWaveStateUrl: "https://hooks.example/api/command-wave/state",
        chatLaunchUrl: "https://hooks.example/api/command-wave/launch/chat",
        launchAuditUrl: "https://hooks.example/api/command-wave/launch/audit",
      },
    });

    expect(draft).toContain("Project build update");
    expect(draft).toContain(`Work: ${proposal.id} - ${proposal.title}`);
    expect(draft).toContain("Decision: passed with 5 yes, 1 no");
    expect(draft).toContain("receipt https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval.");
    expect(draft).toContain(`PR: ${demoWave.repoUrl}/pull/12`);
    expect(draft).toContain("Review proof: not bound to the selected GitHub repo.");
    expect(draft).toContain("Verification: setup proof https://hooks.example/api/command-wave/setup/proof");
    expect(draft).toContain("verification manifest https://hooks.example/api/command-wave/verification/manifest");
    expect(draft).toContain("project index https://hooks.example/api/command-wave/projects");
    expect(draft).toContain("state https://hooks.example/api/command-wave/state");
    expect(draft).toContain("chat launch https://hooks.example/api/command-wave/launch/chat");
    expect(draft).toContain("launch audit https://hooks.example/api/command-wave/launch/audit.");
    expect(draft).toContain("humans keep merge, deploy, payment, and governance authority");
    expect(draft).toContain("Report scores are informational only.");
    expect(draft).toContain("Developer fee plan:");
    expect(draft).toContain("No automatic payouts.");
    expect(draft).toContain("post it manually in chat if it matches the work");
    expect(draft).not.toContain("automatically posted");
  });

  it("includes repo-bound review proof when the selected repo matches", () => {
    const proposal = configuredDemoWave.proposals[0];
    const draft = createWaveUpdateDraft({
      wave: configuredDemoWave,
      proposal,
      poll: configuredDemoWave.polls[0],
      execution: configuredDemoWave.executions[0],
      review: configuredDemoWave.reviews[0],
    });

    expect(draft).toContain(
      `Review proof: ${configuredDemoWave.reviews[0].proof?.verifierVersion} / ${configuredDemoWave.reviews[0].proof?.attestationHash}`,
    );
    expect(draft).not.toContain("Review proof: not bound to the selected GitHub repo.");
  });

  it("handles early setup before a proposal has run", () => {
    const draft = createWaveUpdateDraft({
      wave: {
        ...demoWave,
        proposals: [],
        polls: [],
        executions: [],
        reviews: [],
      },
      proposal: null,
      poll: null,
      execution: null,
      review: null,
    });

    expect(draft).toContain("Work: none selected yet.");
    expect(draft).toContain("Build: waiting for an approved PR change.");
    expect(draft).toContain("Review: waiting for a PR record.");
  });

  it("keeps local vote approval waiting for a project decision receipt", () => {
    const draft = createWaveUpdateDraft({
      wave: demoWave,
      proposal: {
        ...demoWave.proposals[0],
        status: "ready_for_vote",
      },
      poll: {
        ...demoWave.polls[0],
        decision: null,
      },
      execution: null,
      review: null,
    });

    expect(draft).toContain("Decision: passed with 5 yes, 1 no");
    expect(draft).toContain("Build: waiting for a recorded project decision.");
  });
});
