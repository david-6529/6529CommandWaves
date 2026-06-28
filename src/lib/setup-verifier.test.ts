import { describe, expect, it } from "vitest";
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
});
