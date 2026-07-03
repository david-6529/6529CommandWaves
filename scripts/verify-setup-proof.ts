import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SetupProof } from "../src/lib/setup-proof";
import { verifySetupProofAgainstGitHubPayloads } from "../src/lib/setup-verifier";

type FetchErrorPayload = {
  setupVerifierFetchError: {
    url: string;
    status: number;
    statusText: string;
  };
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function readJsonUrl<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function readOptionalJsonUrl(url: string, token?: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return {
      setupVerifierFetchError: {
        url,
        status: response.status,
        statusText: response.statusText,
      },
    } satisfies FetchErrorPayload;
  }

  return response.json() as Promise<unknown>;
}

async function loadSetupProof() {
  const proofPath = process.env.SETUP_PROOF_PATH;
  const proofUrl = process.env.SETUP_PROOF_URL;
  const payload = proofPath?.trim()
    ? readJsonFile<SetupProof | { proof: SetupProof }>(resolve(proofPath))
    : proofUrl?.trim()
      ? await readJsonUrl<SetupProof | { proof: SetupProof }>(proofUrl)
      : null;

  if (!payload) {
    throw new Error("SETUP_PROOF_PATH or SETUP_PROOF_URL is required.");
  }

  return "proof" in payload ? payload.proof : payload;
}

async function loadGitHubPayloads(proof: SetupProof) {
  const payloadPath = process.env.SETUP_GITHUB_PAYLOADS_PATH;

  if (payloadPath?.trim()) {
    return readJsonFile<unknown[]>(resolve(payloadPath));
  }

  const urls = [proof.verificationTargets.githubRulesetsApi, proof.verificationTargets.githubBranchRulesApi].filter(
    (item): item is string => Boolean(item),
  );

  if (!urls.length) {
    throw new Error("Setup proof does not include GitHub verification targets.");
  }

  return Promise.all(urls.map((url) => readOptionalJsonUrl(url, process.env.GITHUB_TOKEN)));
}

async function loadCommandWaveState(proof: SetupProof) {
  const url = proof.verificationTargets.commandWaveStateUrl;

  return url ? readJsonUrl<unknown>(url) : undefined;
}

function writeResult(path: string | undefined, value: unknown) {
  if (!path?.trim()) {
    return;
  }

  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

function setupVerifierFetchError(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  const error = record && "setupVerifierFetchError" in record ? record.setupVerifierFetchError : null;

  if (!error || typeof error !== "object" || Array.isArray(error)) {
    return null;
  }

  const payload = error as Record<string, unknown>;
  const url = typeof payload.url === "string" ? payload.url : "";
  const status = typeof payload.status === "number" ? payload.status : 0;
  const statusText = typeof payload.statusText === "string" ? payload.statusText : "";

  return url && status ? { url, status, statusText } : null;
}

async function main() {
  const proof = await loadSetupProof();
  const payloads = await loadGitHubPayloads(proof);
  const fetchErrors = payloads.map(setupVerifierFetchError).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const commandWaveState = await loadCommandWaveState(proof);
  const result = verifySetupProofAgainstGitHubPayloads(proof, payloads, {
    requireExternalGuardian: process.env.SETUP_REQUIRE_EXTERNAL_GUARDIAN === "true",
    requireProductionStorage: process.env.SETUP_REQUIRE_PRODUCTION_STORAGE === "true",
    commandWaveState,
  });

  writeResult(process.env.SETUP_VERIFICATION_PATH, result);

  console.log(`Setup verification: ${result.status}`);
  console.log(`Required checks: ${result.requiredChecks.join(", ") || "none"}`);
  console.log(`Observed required checks: ${result.observedRequiredChecks.join(", ") || "none"}`);

  for (const item of fetchErrors) {
    console.log(`GITHUB_TARGET_UNAVAILABLE ${item.status}: ${item.url} ${item.statusText}`.trim());
  }

  for (const item of result.checks) {
    console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
  }

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
