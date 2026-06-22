import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SetupProof } from "../src/lib/setup-proof";
import { verifySetupProofAgainstGitHubPayloads } from "../src/lib/setup-verifier";

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

  return Promise.all(urls.map((url) => readJsonUrl<unknown>(url, process.env.GITHUB_TOKEN)));
}

function writeResult(path: string | undefined, value: unknown) {
  if (!path?.trim()) {
    return;
  }

  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const proof = await loadSetupProof();
  const payloads = await loadGitHubPayloads(proof);
  const result = verifySetupProofAgainstGitHubPayloads(proof, payloads);

  writeResult(process.env.SETUP_VERIFICATION_PATH, result);

  console.log(`Setup verification: ${result.status}`);
  console.log(`Required checks: ${result.requiredChecks.join(", ") || "none"}`);
  console.log(`Observed required checks: ${result.observedRequiredChecks.join(", ") || "none"}`);

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
