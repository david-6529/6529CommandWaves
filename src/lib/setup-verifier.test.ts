import { describe, expect, it } from "vitest";
import { createCommandWaveStateSnapshot } from "./command-wave-state";
import { demoWave } from "./demo-wave";
import { createSetupProof } from "./setup-proof";
import { extractRequiredStatusChecks, verifySetupProofAgainstGitHubPayloads } from "./setup-verifier";

describe("setup verifier", () => {
  it("extracts required checks from ruleset payloads", () => {
    expect(
      extractRequiredStatusChecks([
        [
          {
            type: "required_status_checks",
            parameters: {
              required_status_checks: [{ context: "Command Waves Guardian" }, { context: "build" }],
            },
          },
        ],
      ]),
    ).toEqual(["build", "Command Waves Guardian"]);
  });

  it("extracts required checks from branch protection style payloads", () => {
    expect(
      extractRequiredStatusChecks([
        {
          required_status_checks: {
            contexts: ["Command Waves Guardian"],
            checks: [{ context: "lint" }],
          },
        },
      ]),
    ).toEqual(["Command Waves Guardian", "lint"]);
  });

  it("passes when proof hash and required guardian check are present", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const result = verifySetupProofAgainstGitHubPayloads(proof, [
      {
        required_status_checks: {
          contexts: ["Command Waves Guardian"],
        },
      },
    ]);

    expect(result.status).toBe("pass");
    expect(result.observedRequiredChecks).toEqual(["Command Waves Guardian"]);
    expect(result.checks.find((item) => item.id === "storage_declared")).toMatchObject({
      status: "pass",
    });
  });

  it("fails when the guardian check is not required", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const result = verifySetupProofAgainstGitHubPayloads(proof, [
      {
        required_status_checks: {
          contexts: ["build"],
        },
      },
    ]);

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "required_check_Command Waves Guardian")).toMatchObject({
      status: "fail",
    });
  });

  it("can require a stronger external guardian for production audits", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const result = verifySetupProofAgainstGitHubPayloads(
      proof,
      [
        {
          required_status_checks: {
            contexts: ["Command Waves Guardian"],
          },
        },
      ],
      { requireExternalGuardian: true },
    );

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "external_guardian")).toMatchObject({
      status: "fail",
    });
  });

  it("can require production storage for broad participation audits", () => {
    const localProof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
      storage: {
        mode: "file",
        durability: "local",
        databaseConfigured: false,
      },
    });
    const localResult = verifySetupProofAgainstGitHubPayloads(
      localProof,
      [
        {
          required_status_checks: {
            contexts: ["Command Waves Guardian"],
          },
        },
      ],
      { requireProductionStorage: true },
    );
    const productionProof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
      storage: {
        mode: "postgres",
        durability: "production",
        databaseConfigured: true,
        limitation: null,
      },
    });
    const productionResult = verifySetupProofAgainstGitHubPayloads(
      productionProof,
      [
        {
          required_status_checks: {
            contexts: ["Command Waves Guardian"],
          },
        },
      ],
      { requireProductionStorage: true },
    );

    expect(localResult.status).toBe("fail");
    expect(localResult.checks.find((item) => item.id === "production_storage")).toMatchObject({
      status: "fail",
    });
    expect(productionResult.status).toBe("pass");
  });

  it("verifies the published command-wave state target when present", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
      commandWaveStateUrl: "https://hooks.example/api/command-wave/state",
    });
    const result = verifySetupProofAgainstGitHubPayloads(
      proof,
      [
        {
          required_status_checks: {
            contexts: ["Command Waves Guardian"],
          },
        },
      ],
      {
        commandWaveState: createCommandWaveStateSnapshot(demoWave, {
          generatedAt: "2026-06-21T12:01:00.000Z",
        }),
      },
    );

    expect(result.status).toBe("pass");
    expect(result.checks.find((item) => item.id === "command_wave_state_available")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "command_wave_state_identity")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "command_wave_state_hash")).toMatchObject({
      status: "pass",
    });
  });

  it("fails when the published command-wave state target points to another wave", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
      commandWaveStateUrl: "https://hooks.example/api/command-wave/state",
    });
    const otherWave = {
      ...demoWave,
      waveUrl: "https://6529.io/waves/other-hook-builder",
    };
    const result = verifySetupProofAgainstGitHubPayloads(
      proof,
      [
        {
          required_status_checks: {
            contexts: ["Command Waves Guardian"],
          },
        },
      ],
      {
        commandWaveState: createCommandWaveStateSnapshot(otherWave, {
          generatedAt: "2026-06-21T12:01:00.000Z",
        }),
      },
    );

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "command_wave_state_identity")).toMatchObject({
      status: "fail",
    });
  });
});
