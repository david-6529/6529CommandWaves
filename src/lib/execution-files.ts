import type { RepoCommitFile } from "./adapters";
import type { CommandProposal } from "./command-waves";
import { hashValue } from "./run-manifest";
import {
  findHookContractSignals,
  proposalAllowsUpgradeabilityException,
  riskAllowsHookContractSignal,
  type HookContractSignal,
} from "./safety/hook-contract-policy";
import { findHookPatchSignals, riskAllowsHookPatchSignal, type HookPatchSignal } from "./safety/hook-diff-policy";
import { evaluateHookParameterPolicy } from "./safety/hook-parameter-policy";

export const executionRequestBodyMaxBytes = 128 * 1024;

export type ExecutionFileManifest = {
  version: "command-wave-approved-files-v0.1";
  proposalId: string;
  fileCount: number;
  totalContentLength: number;
  files: Array<{
    path: string;
    contentHash: string;
    contentLength: number;
  }>;
  manifestHash: string;
};

const maxApprovedFiles = 8;
const maxApprovedFileChars = 20_000;
const maxApprovedFileTotalChars = 80_000;
const maxApprovedFilePathChars = 180;
const hardBlockedContractSignals = new Set(["deployment", "governance_change", "upgradeability"]);
const hardBlockedPatchSignals = new Set([
  "upgradeability_pattern",
  "delegatecall",
  "destructive_opcode",
  "deployment_action",
  "governance_authority",
]);

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function error(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeExecutionFilePath(value: unknown) {
  if (typeof value !== "string") {
    throw error("Approved file path must be a string.");
  }

  const path = value.trim();
  const segments = path.split("/");
  const invalid =
    !path ||
    path.length > maxApprovedFilePathChars ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    segments.some((segment) => !segment || segment === "." || segment === "..");

  if (invalid) {
    throw error("Approved file paths must be relative paths without empty or parent segments.");
  }

  return path;
}

function validateExecutionFileContent(value: unknown) {
  if (typeof value !== "string") {
    throw error("Approved file content must be a string.");
  }

  if (value.includes("\0")) {
    throw error("Approved file content must be text.");
  }

  if (value.length > maxApprovedFileChars) {
    throw error(`Each approved file must be ${maxApprovedFileChars} characters or less.`);
  }

  return value;
}

function assertAllowedRepoPath(path: string) {
  const lower = path.toLowerCase();
  const fileName = lower.split("/").at(-1) ?? lower;
  const blocksSecret =
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    fileName === ".npmrc" ||
    fileName === ".pypirc" ||
    fileName === "id_rsa" ||
    /\.(?:pem|key|p12|pfx)$/i.test(path);
  const blocksRepoControl =
    lower.startsWith(".github/workflows/") ||
    lower === "scripts/guardian-pr-check.ts" ||
    lower === "scripts/verify-guardian-proof.ts" ||
    lower === "src/lib/github/pr-reviewer-gate.ts" ||
    lower === "src/lib/setup-proof.ts" ||
    lower === "src/lib/setup-verifier.ts";

  if (blocksSecret) {
    throw error("Approved files cannot include secrets or credential files.");
  }

  if (blocksRepoControl) {
    throw error("Approved files cannot change repo control, guardian, or setup-proof code in phase 1.");
  }
}

function contentAsAddedPatch(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => `+${line}`)
    .join("\n");
}

function signalLabels(signals: Array<HookContractSignal | HookPatchSignal>) {
  return [...new Set(signals.map((signal) => signal.label.replaceAll("_", " ")))]
    .sort((left, right) => left.localeCompare(right))
    .join(", ");
}

function validateHookFileSafety(files: RepoCommitFile[], proposal: CommandProposal) {
  if (!files.length) {
    return;
  }

  const changedPaths = files.map((file) => file.path);
  const changedFiles = files.map((file) => ({
    path: file.path,
    patch: contentAsAddedPatch(file.content),
  }));
  const proposalText = `${proposal.prompt}\n${proposal.spec}`;
  const hookSignals = findHookContractSignals({ changedPaths, proposalText });
  const hookPatchSignals = findHookPatchSignals(changedFiles);
  const upgradeabilityExceptionApproved = proposalAllowsUpgradeabilityException(proposalText);
  const blockedContractSignals = hookSignals.filter(
    (signal) =>
      hardBlockedContractSignals.has(signal.label) ||
      !riskAllowsHookContractSignal({
        risk: proposal.risk,
        signal,
        upgradeabilityExceptionApproved,
      }),
  );
  const blockedPatchSignals = hookPatchSignals.filter(
    (signal) =>
      hardBlockedPatchSignals.has(signal.label) ||
      !riskAllowsHookPatchSignal({
        risk: proposal.risk,
        signal,
        upgradeabilityExceptionApproved,
      }),
  );

  if (blockedContractSignals.length) {
    throw error(`Approved files touch blocked hook surfaces: ${signalLabels(blockedContractSignals)}.`);
  }

  if (blockedPatchSignals.length) {
    throw error(`Approved files add blocked hook code: ${signalLabels(blockedPatchSignals)}.`);
  }

  const parameterChecks = evaluateHookParameterPolicy({
    proposalText,
    changedPaths,
    changedFiles,
    hookSignals,
    hookPatchSignals,
  });
  const failedParameterChecks = parameterChecks.filter((check) => check.status === "fail");

  if (failedParameterChecks.length) {
    throw error(failedParameterChecks[0]?.message ?? "Approved files failed hook parameter policy.");
  }
}

export function parseExecutionFiles(input: unknown, proposal: CommandProposal): RepoCommitFile[] {
  if (input === undefined) {
    return [];
  }

  if (!Array.isArray(input)) {
    throw error("Approved files must be an array.");
  }

  if (input.length > maxApprovedFiles) {
    throw error(`Approved file bundles are limited to ${maxApprovedFiles} files.`);
  }

  const seen = new Set<string>();
  let totalChars = 0;
  const files = input.map((item) => {
    const record = asRecord(item);

    if (!record) {
      throw error("Approved files must be objects with path and content.");
    }

    const path = normalizeExecutionFilePath(record.path);
    const content = validateExecutionFileContent(record.content);

    if (seen.has(path)) {
      throw error("Approved file paths must be unique.");
    }

    assertAllowedRepoPath(path);
    seen.add(path);
    totalChars += content.length;

    if (totalChars > maxApprovedFileTotalChars) {
      throw error(`Approved file bundles are limited to ${maxApprovedFileTotalChars} total characters.`);
    }

    return { path, content };
  });

  validateHookFileSafety(files, proposal);

  return files;
}

function manifestWithoutHash(manifest: Omit<ExecutionFileManifest, "manifestHash">) {
  return manifest;
}

export function createExecutionFileManifest(proposalId: string, files: RepoCommitFile[]): ExecutionFileManifest {
  const manifest = manifestWithoutHash({
    version: "command-wave-approved-files-v0.1",
    proposalId,
    fileCount: files.length,
    totalContentLength: files.reduce((total, file) => total + file.content.length, 0),
    files: [...files]
      .map((file) => ({
        path: file.path,
        contentHash: hashValue(file.content),
        contentLength: file.content.length,
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  });

  return {
    ...manifest,
    manifestHash: hashValue(manifest),
  };
}

export function formatExecutionFileManifestArtifact(manifest: ExecutionFileManifest) {
  return `approved-files:${JSON.stringify(manifest)}`;
}

export function findExecutionFileManifestArtifact(artifacts: string[]) {
  const rawManifest = artifacts.find((artifact) => artifact.startsWith("approved-files:"))?.slice("approved-files:".length);

  if (!rawManifest) {
    return null;
  }

  try {
    return JSON.parse(rawManifest) as ExecutionFileManifest;
  } catch {
    return null;
  }
}

export function executionFileManifestHashMatches(manifest: ExecutionFileManifest | null) {
  if (!manifest) {
    return false;
  }

  const { manifestHash, ...manifestWithoutManifestHash } = manifest;

  return hashValue(manifestWithoutManifestHash) === manifestHash;
}
