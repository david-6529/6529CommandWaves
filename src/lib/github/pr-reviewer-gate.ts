import {
  evaluateGate,
  evaluatePoll,
  pollApprovalPassedForWave,
  validateWaveDecisionReference,
  type CommandKind,
  type CommandProposal,
  type CommandWave,
  type PollState,
  type RiskLevel,
} from "../command-waves";
import { createCommandRunManifest, hashValue } from "../run-manifest";
import {
  findHookContractSignals,
  proposalAllowsUpgradeabilityException,
  riskAllowsHookContractSignal,
  type HookContractSignal,
} from "../safety/hook-contract-policy";
import {
  findHookPatchSignals,
  normalizeChangedFiles,
  riskAllowsHookPatchSignal,
  type HookChangedFile,
  type HookPatchSignal,
} from "../safety/hook-diff-policy";
import { evaluateHookParameterPolicy, type HookParameterPolicyCheck } from "../safety/hook-parameter-policy";
import { toolPolicyForProposal, type ToolPermission } from "../safety/tool-policy";

export const REVIEWER_GATE_VERSION = "command-wave-reviewer-gate-v0.5" as const;

export type CommandPrManifest = {
  version: "command-wave-pr-v0.1";
  waveId: string;
  waveUrl: string;
  proposalId: string;
  pollDropId: string | null;
  commandKind: CommandKind;
  risk: RiskLevel;
  rulesVersion: string;
  rulesHash: string;
  promptHash: string;
  specHash: string;
  allowedPermissions: ToolPermission[];
  runManifestHash: string;
  approval: {
    status: "not_required" | "pending" | "passed";
    yesVotes: number;
    noVotes: number;
    quorumRequired: number;
    yesPercentRequired: number;
  };
};

export type PrDiffSignal = {
  label: string;
  risk: Exclude<RiskLevel, "low">;
  path: string;
  reason: string;
};

export type ReviewerGateCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export type ReviewerGateResult = {
  status: "pass" | "fail";
  checks: ReviewerGateCheck[];
  diffSignals: PrDiffSignal[];
  hookSignals: HookContractSignal[];
  hookPatchSignals: HookPatchSignal[];
  hookParameterChecks: HookParameterPolicyCheck[];
};

export type GuardianAttestation = {
  version: "guardian-attestation-v0.1";
  generatedAt: string;
  verifier: {
    name: "Command Waves Guardian";
    version: typeof REVIEWER_GATE_VERSION;
    mode: "deterministic";
  };
  inputs: {
    waveId: string;
    proposalId: string | null;
    waveStateHash: string;
    proposalHash: string | null;
    pollHash: string | null;
    manifestHash: string | null;
    changedPathsHash: string;
    changedFilesHash?: string;
    rulesHash: string;
  };
  result: ReviewerGateResult;
  resultHash: string;
  attestationHash: string;
};

export type GuardianPullRequestEvidence = {
  pullRequestBody: string;
  changedPaths: string[];
  changedFiles?: HookChangedFile[];
  generatedAt?: string;
};

export type GuardianProofVerificationCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export type GuardianProofVerificationResult = {
  status: "pass" | "fail";
  checks: GuardianProofVerificationCheck[];
  expectedAttestationHash: string;
  actualAttestationHash: string;
};

export const COMMAND_PR_MANIFEST_START = "<!-- command-waves:manifest:start -->";
export const COMMAND_PR_MANIFEST_END = "<!-- command-waves:manifest:end -->";

const proposalStatusesAllowedToLand: CommandProposal["status"][] = ["approved", "reviewing", "complete"];

const diffSignalRules: Array<{
  label: string;
  risk: Exclude<RiskLevel, "low">;
  pattern: RegExp;
  reason: string;
}> = [
  {
    label: "guardian_proof",
    risk: "critical",
    pattern:
      /^(\.github\/workflows\/guardian-review\.yml|scripts\/(guardian-pr-check|verify-guardian-proof)\.ts|src\/lib\/github\/(pr-reviewer-gate|guardian-summary)\.ts|src\/lib\/setup-(proof|verifier)\.ts)$/,
    reason: "Guardian, reviewer, and setup-proof changes can alter merge enforcement or proof verification.",
  },
  {
    label: "workflow",
    risk: "high",
    pattern: /^\.github\/workflows\//,
    reason: "GitHub workflow changes can alter review/deploy enforcement.",
  },
  {
    label: "deployment",
    risk: "high",
    pattern: /(^|\/)(vercel\.json|Dockerfile|docker-compose\.ya?ml|deploy|deployment)/i,
    reason: "Deployment configuration changes can affect production.",
  },
  {
    label: "secrets",
    risk: "high",
    pattern: /(^|\/)(\.env|.*secret.*|.*token.*|.*key.*)/i,
    reason: "Secret or token handling needs explicit review.",
  },
  {
    label: "auth",
    risk: "high",
    pattern: /(^|\/)(auth|wallet|payment|billing|checkout|permissions?|security)(\/|\.|-|_)/i,
    reason: "Auth, wallet, payment, and permission surfaces are high risk.",
  },
  {
    label: "rules",
    risk: "critical",
    pattern: /(^|\/)(rules|governance|policy|guardrail|reviewer-gate)(\/|\.|-|_)/i,
    reason: "Governance and review gate changes can change what the agent is allowed to do.",
  },
];

function check(id: string, status: ReviewerGateCheck["status"], message: string): ReviewerGateCheck {
  return { id, status, message };
}

function overall(checks: ReviewerGateCheck[]) {
  return checks.some((item) => item.status === "fail") ? "fail" : "pass";
}

function verificationCheck(
  id: string,
  status: GuardianProofVerificationCheck["status"],
  message: string,
): GuardianProofVerificationCheck {
  return { id, status, message };
}

function checkIdValue(value: string) {
  return value.replace(/[^a-z0-9/_-]+/gi, "_").slice(0, 96);
}

function waveIdFromUrl(value: string) {
  return value.match(/\/waves\/([^/?#\s]+)/)?.[1] ?? value;
}

function sortedPaths(paths: string[]) {
  return [...paths].sort((a, b) => a.localeCompare(b));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCommandPrManifest(value: unknown): value is CommandPrManifest {
  const manifest = isRecord(value) ? value : null;
  const approval = isRecord(manifest?.approval) ? manifest.approval : null;

  return Boolean(
    manifest &&
      manifest.version === "command-wave-pr-v0.1" &&
      typeof manifest.waveId === "string" &&
      typeof manifest.waveUrl === "string" &&
      typeof manifest.proposalId === "string" &&
      (typeof manifest.pollDropId === "string" || manifest.pollDropId === null) &&
      typeof manifest.commandKind === "string" &&
      typeof manifest.risk === "string" &&
      typeof manifest.rulesVersion === "string" &&
      typeof manifest.rulesHash === "string" &&
      typeof manifest.promptHash === "string" &&
      typeof manifest.specHash === "string" &&
      Array.isArray(manifest.allowedPermissions) &&
      typeof manifest.runManifestHash === "string" &&
      approval &&
      (approval.status === "not_required" || approval.status === "pending" || approval.status === "passed") &&
      typeof approval.yesVotes === "number" &&
      typeof approval.noVotes === "number" &&
      typeof approval.quorumRequired === "number" &&
      typeof approval.yesPercentRequired === "number",
  );
}

function riskAllowsSignal(risk: RiskLevel, signal: PrDiffSignal) {
  if (signal.risk === "medium") {
    return risk === "medium" || risk === "high" || risk === "critical";
  }

  if (signal.risk === "high") {
    return risk === "high" || risk === "critical";
  }

  return risk === "critical";
}

function validatePollDecisionReference(poll: PollState | null, waveUrl: string) {
  if (!poll?.decision) {
    return null;
  }

  return validateWaveDecisionReference({
    reference: poll.decision.url ?? poll.decision.dropId ?? "",
    waveUrl,
    requireUrl: true,
  });
}

export function findPrDiffSignals(paths: string[] = []): PrDiffSignal[] {
  return paths.flatMap((path) =>
    diffSignalRules
      .filter((rule) => rule.pattern.test(path))
      .map((rule) => ({
        label: rule.label,
        risk: rule.risk,
        path,
        reason: rule.reason,
      })),
  );
}

export function createCommandPrManifest({
  wave,
  proposal,
  poll,
  pollDropId,
}: {
  wave: CommandWave;
  proposal: CommandProposal;
  poll: PollState | null;
  pollDropId?: string | null;
}): CommandPrManifest {
  const runManifest = createCommandRunManifest({ wave, proposal });
  const approvalPassed = pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true });

  return {
    version: "command-wave-pr-v0.1",
    waveId: waveIdFromUrl(wave.waveUrl),
    waveUrl: wave.waveUrl,
    proposalId: proposal.id,
    pollDropId: pollDropId ?? poll?.decision?.dropId ?? null,
    commandKind: proposal.kind,
    risk: proposal.risk,
    rulesVersion: wave.rules.version,
    rulesHash: hashValue(wave.rules),
    promptHash: hashValue(proposal.prompt),
    specHash: hashValue(proposal.spec),
    allowedPermissions: toolPolicyForProposal(proposal).permissions,
    runManifestHash: runManifest.manifestHash,
    approval: poll
      ? {
          status: approvalPassed ? "passed" : "pending",
          yesVotes: poll.yesVotes,
          noVotes: poll.noVotes,
          quorumRequired: poll.quorumRequired,
          yesPercentRequired: poll.yesPercentRequired,
        }
      : {
          status: "not_required",
          yesVotes: 0,
          noVotes: 0,
          quorumRequired: 0,
          yesPercentRequired: 0,
        },
  };
}

export function formatCommandPrManifestForPullRequest(manifest: CommandPrManifest) {
  return [
    COMMAND_PR_MANIFEST_START,
    "```json",
    JSON.stringify(manifest, null, 2),
    "```",
    COMMAND_PR_MANIFEST_END,
  ].join("\n");
}

export function extractCommandPrManifestFromPullRequestBody(body: string) {
  const start = body.indexOf(COMMAND_PR_MANIFEST_START);
  const end = body.indexOf(COMMAND_PR_MANIFEST_END);

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const block = body.slice(start + COMMAND_PR_MANIFEST_START.length, end);
  const fencedJson = block.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const rawJson = (fencedJson?.[1] ?? block).trim();

  if (!rawJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawJson);

    return isCommandPrManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function validateCommandPrManifest({
  wave,
  proposal,
  poll,
  manifest,
  changedPaths = [],
  changedFiles = [],
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  manifest: CommandPrManifest | null;
  changedPaths?: string[];
  changedFiles?: HookChangedFile[];
}): ReviewerGateResult {
  const checks: ReviewerGateCheck[] = [];
  const diffSignals = findPrDiffSignals(changedPaths);
  const proposalText = proposal ? `${proposal.prompt}\n${proposal.spec}` : "";
  const hookPatchSignals = findHookPatchSignals(changedFiles);
  const hookSignals = findHookContractSignals({
    changedPaths,
    proposalText,
  });
  const hookParameterChecks = evaluateHookParameterPolicy({
    changedPaths,
    proposalText,
    hookSignals,
  });
  const upgradeabilityExceptionApproved = proposalAllowsUpgradeabilityException(proposalText);

  if (!proposal) {
    checks.push(check("proposal_exists", "fail", "No matching command proposal was found."));
    return { status: "fail", checks, diffSignals, hookSignals, hookPatchSignals, hookParameterChecks };
  }

  if (!manifest) {
    checks.push(check("manifest_exists", "fail", "PR is missing a Command Waves manifest."));
    return { status: "fail", checks, diffSignals, hookSignals, hookPatchSignals, hookParameterChecks };
  }

  const expected = createCommandPrManifest({ wave, proposal, poll });
  const gate = evaluateGate(proposal, wave.rules);
  const pollResult = poll ? evaluatePoll(poll) : null;
  const decisionReferenceCheck = validatePollDecisionReference(poll, wave.waveUrl);
  const approvalPassed = pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true });

  checks.push(
    check(
      "wave_identity",
      manifest.waveId === expected.waveId && manifest.waveUrl === expected.waveUrl ? "pass" : "fail",
      "Manifest wave id and URL match the governed wave.",
    ),
  );
  checks.push(
    check(
      "proposal_identity",
      manifest.proposalId === proposal.id ? "pass" : "fail",
      "Manifest proposal id matches the approved command.",
    ),
  );
  checks.push(
    check(
      "poll_drop_id",
      manifest.pollDropId === expected.pollDropId ? "pass" : "fail",
      expected.pollDropId
        ? "Manifest poll drop id matches the project decision receipt."
        : "No poll drop id is required by the approved command.",
    ),
  );
  checks.push(
    check(
      "proposal_status",
      proposalStatusesAllowedToLand.includes(proposal.status) ? "pass" : "fail",
      `Proposal status is ${proposal.status}.`,
    ),
  );
  checks.push(
    check(
      "command_kind",
      manifest.commandKind === proposal.kind && proposal.kind === "open_pr" ? "pass" : "fail",
      proposal.kind === "open_pr"
        ? "PR is linked to an open_pr command."
        : `PRs require an open_pr command, not ${proposal.kind}.`,
    ),
  );
  checks.push(
    check(
      "rules_hash",
      manifest.rulesVersion === expected.rulesVersion && manifest.rulesHash === expected.rulesHash ? "pass" : "fail",
      "Rules version and hash match the approved command.",
    ),
  );
  checks.push(
    check(
      "prompt_spec_hashes",
      manifest.promptHash === expected.promptHash && manifest.specHash === expected.specHash ? "pass" : "fail",
      "Prompt and success-criteria hashes match the approved command.",
    ),
  );
  checks.push(
    check(
      "permissions",
      JSON.stringify(manifest.allowedPermissions) === JSON.stringify(expected.allowedPermissions) ? "pass" : "fail",
      "Manifest permissions match the command type.",
    ),
  );
  checks.push(
    check(
      "run_manifest_hash",
      manifest.runManifestHash === expected.runManifestHash ? "pass" : "fail",
      "PR manifest points to the expected run manifest hash.",
    ),
  );
  checks.push(
    check(
      "vote",
      gate.needsPoll ? (approvalPassed && manifest.approval.status === "passed" ? "pass" : "fail") : "pass",
      gate.needsPoll
        ? poll?.decision
          ? decisionReferenceCheck?.ok
            ? `Project decision receipt ${approvalPassed ? "passed" : "has not passed"} for ${poll.decision.dropId ?? poll.decision.url ?? "recorded approval"}.`
            : (decisionReferenceCheck?.message ?? "Project decision receipt is not valid.")
          : pollResult?.passed
            ? "Local vote passed. Record a project decision receipt before PR review can pass."
            : `Vote has not passed under quorum ${gate.rule.quorum} / yes ${gate.rule.yesPercent}%.`
        : "No vote is required by the current rules.",
    ),
  );

  for (const signal of diffSignals) {
    checks.push(
      check(
        `diff_${signal.label}_${signal.path}`,
        riskAllowsSignal(manifest.risk, signal) ? "pass" : "fail",
        `${signal.path}: ${signal.reason}`,
      ),
    );
  }

  for (const signal of hookSignals) {
    const allowed = riskAllowsHookContractSignal({
      risk: manifest.risk,
      signal,
      upgradeabilityExceptionApproved,
    });

    checks.push(
      check(
        `hook_${signal.label}_${signal.source}_${checkIdValue(signal.value)}`,
        allowed ? "pass" : "fail",
        `${signal.value}: ${signal.reason}`,
      ),
    );
  }

  for (const signal of hookPatchSignals) {
    const allowed = riskAllowsHookPatchSignal({
      risk: manifest.risk,
      signal,
      upgradeabilityExceptionApproved,
    });

    checks.push(
      check(
        `hook_patch_${signal.label}_${checkIdValue(signal.path)}_${checkIdValue(signal.line)}`,
        allowed ? "pass" : "fail",
        `${signal.path}: ${signal.reason}`,
      ),
    );
  }

  checks.push(...hookParameterChecks);

  return {
    status: overall(checks),
    checks,
    diffSignals,
    hookSignals,
    hookPatchSignals,
    hookParameterChecks,
  };
}

export function createGuardianAttestation({
  wave,
  proposal,
  poll,
  manifest,
  changedPaths = [],
  changedFiles = [],
  generatedAt,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  manifest: CommandPrManifest | null;
  changedPaths?: string[];
  changedFiles?: HookChangedFile[];
  generatedAt?: string;
}): GuardianAttestation {
  const sortedChangedPaths = sortedPaths(changedPaths);
  const sortedChangedFiles = normalizeChangedFiles(changedFiles);
  const result = validateCommandPrManifest({
    wave,
    proposal,
    poll,
    manifest,
    changedPaths: sortedChangedPaths,
    changedFiles: sortedChangedFiles,
  });
  const resultHash = hashValue(result);
  const attestationBase = {
    version: "guardian-attestation-v0.1" as const,
    generatedAt: generatedAt ?? new Date().toISOString(),
    verifier: {
      name: "Command Waves Guardian" as const,
      version: REVIEWER_GATE_VERSION,
      mode: "deterministic" as const,
    },
    inputs: {
      waveId: waveIdFromUrl(wave.waveUrl),
      proposalId: proposal?.id ?? null,
      waveStateHash: hashValue(wave),
      proposalHash: proposal ? hashValue(proposal) : null,
      pollHash: poll ? hashValue(poll) : null,
      manifestHash: manifest ? hashValue(manifest) : null,
      changedPathsHash: hashValue(sortedChangedPaths),
      changedFilesHash: hashValue(sortedChangedFiles),
      rulesHash: hashValue(wave.rules),
    },
    result,
    resultHash,
  };

  return {
    ...attestationBase,
    attestationHash: hashValue(attestationBase),
  };
}

export function verifyGuardianAttestation({
  wave,
  proposal,
  poll,
  manifest,
  changedPaths = [],
  changedFiles = [],
  attestation,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  manifest: CommandPrManifest | null;
  changedPaths?: string[];
  changedFiles?: HookChangedFile[];
  attestation: GuardianAttestation;
}) {
  const expected = createGuardianAttestation({
    wave,
    proposal,
    poll,
    manifest,
    changedPaths,
    changedFiles,
    generatedAt: attestation.generatedAt,
  });

  return expected.attestationHash === attestation.attestationHash && expected.resultHash === attestation.resultHash;
}

export function createGuardianPullRequestAttestation({
  wave,
  evidence,
}: {
  wave: CommandWave;
  evidence: GuardianPullRequestEvidence;
}) {
  const manifest = extractCommandPrManifestFromPullRequestBody(evidence.pullRequestBody);
  const proposal = manifest ? wave.proposals.find((item) => item.id === manifest.proposalId) ?? null : null;
  const poll = manifest ? wave.polls.find((item) => item.proposalId === manifest.proposalId) ?? null : null;

  return createGuardianAttestation({
    wave,
    proposal,
    poll,
    manifest,
    changedPaths: evidence.changedPaths,
    changedFiles: evidence.changedFiles ?? [],
    generatedAt: evidence.generatedAt,
  });
}

export function verifyGuardianPullRequestProof({
  wave,
  evidence,
  attestation,
}: {
  wave: CommandWave;
  evidence: GuardianPullRequestEvidence;
  attestation: GuardianAttestation;
}): GuardianProofVerificationResult {
  const expected = createGuardianPullRequestAttestation({
    wave,
    evidence: {
      ...evidence,
      generatedAt: attestation.generatedAt,
    },
  });
  const checks: GuardianProofVerificationCheck[] = [
    verificationCheck(
      "wave_state_hash",
      expected.inputs.waveStateHash === attestation.inputs.waveStateHash ? "pass" : "fail",
      "Wave-state snapshot hash matches the attestation input.",
    ),
    verificationCheck(
      "proposal_hash",
      expected.inputs.proposalHash === attestation.inputs.proposalHash ? "pass" : "fail",
      "Proposal hash matches the attestation input.",
    ),
    verificationCheck(
      "poll_hash",
      expected.inputs.pollHash === attestation.inputs.pollHash ? "pass" : "fail",
      "Poll hash matches the attestation input.",
    ),
    verificationCheck(
      "manifest_hash",
      expected.inputs.manifestHash === attestation.inputs.manifestHash ? "pass" : "fail",
      "PR manifest hash matches the attestation input.",
    ),
    verificationCheck(
      "changed_paths_hash",
      expected.inputs.changedPathsHash === attestation.inputs.changedPathsHash ? "pass" : "fail",
      "Changed-paths hash matches the attestation input.",
    ),
    verificationCheck(
      "changed_files_hash",
      !attestation.inputs.changedFilesHash || expected.inputs.changedFilesHash === attestation.inputs.changedFilesHash
        ? "pass"
        : "fail",
      attestation.inputs.changedFilesHash
        ? "Changed-file patch hash matches the attestation input."
        : "No changed-file patch hash is present on this legacy attestation.",
    ),
    verificationCheck(
      "result_hash",
      expected.resultHash === attestation.resultHash ? "pass" : "fail",
      "Guardian result hash is reproducible from the supplied artifacts.",
    ),
    verificationCheck(
      "attestation_hash",
      expected.attestationHash === attestation.attestationHash ? "pass" : "fail",
      "Guardian attestation hash is reproducible from the supplied artifacts.",
    ),
  ];

  return {
    status: checks.some((item) => item.status === "fail") ? "fail" : "pass",
    checks,
    expectedAttestationHash: expected.attestationHash,
    actualAttestationHash: attestation.attestationHash,
  };
}
