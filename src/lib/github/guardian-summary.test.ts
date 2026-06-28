import { describe, expect, it } from "vitest";
import { demoWave } from "../demo-wave";
import { createCommandPrManifest, createGuardianAttestation } from "./pr-reviewer-gate";
import { formatGuardianStepSummary } from "./guardian-summary";

describe("guardian summary", () => {
  it("formats attestation proof for GitHub step summary", () => {
    const proposal = demoWave.proposals[0];
    const poll = demoWave.polls.find((item) => item.proposalId === proposal.id) ?? null;
    const attestation = createGuardianAttestation({
      wave: demoWave,
      proposal,
      poll,
      manifest: createCommandPrManifest({ wave: demoWave, proposal, poll }),
      changedPaths: ["README.md"],
      changedFiles: [{ path: "README.md", patch: "@@\n+doc update" }],
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const summary = formatGuardianStepSummary(attestation);

    expect(summary).toContain("# Command Waves Guardian");
    expect(summary).toContain("Status: **PASS**");
    expect(summary).toContain(attestation.attestationHash);
    expect(summary).toContain(attestation.inputs.waveStateHash);
    expect(summary).toContain(attestation.inputs.changedFilesHash ?? "");
    expect(summary).toContain("| Status | Check | Message |");
    expect(summary).toContain("`rules_hash`");
  });
});
