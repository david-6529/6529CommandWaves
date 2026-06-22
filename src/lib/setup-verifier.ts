import type { SetupProof } from "./setup-proof";
import { verifySetupProofHash } from "./setup-proof";

export type SetupVerificationCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export type SetupVerificationResult = {
  status: "pass" | "fail";
  requiredChecks: string[];
  observedRequiredChecks: string[];
  checks: SetupVerificationCheck[];
};

function check(id: string, status: SetupVerificationCheck["status"], message: string): SetupVerificationCheck {
  return { id, status, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fromRequiredStatusCheckObject(value: unknown) {
  const record = isRecord(value) ? value : null;

  if (!record) {
    return [];
  }

  return [asString(record.context), asString(record.name), asString(record.check_name), asString(record.checkName)].filter(
    (item): item is string => Boolean(item),
  );
}

function collectFromRequiredStatusContainer(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === "string" ? [item] : fromRequiredStatusCheckObject(item).concat(collectFromRequiredStatusContainer(item)),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  return [
    ...fromRequiredStatusCheckObject(value),
    ...collectFromRequiredStatusContainer(value.contexts),
    ...collectFromRequiredStatusContainer(value.checks),
    ...collectFromRequiredStatusContainer(value.required_status_checks),
    ...collectFromRequiredStatusContainer(value.requiredStatusChecks),
  ];
}

function collectRequiredChecksFromRule(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }

  const type = asString(value.type);
  const parameterChecks = collectFromRequiredStatusContainer(value.parameters);

  if (type === "required_status_checks") {
    return parameterChecks;
  }

  return [
    ...collectFromRequiredStatusContainer(value.required_status_checks),
    ...collectFromRequiredStatusContainer(value.requiredStatusChecks),
  ];
}

export function extractRequiredStatusChecks(payloads: unknown[]) {
  const found = new Set<string>();

  function visit(value: unknown, keyHint = "") {
    if (keyHint === "required_status_checks" || keyHint === "requiredStatusChecks") {
      for (const item of collectFromRequiredStatusContainer(value)) {
        found.add(item);
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, keyHint);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const item of collectRequiredChecksFromRule(value)) {
      found.add(item);
    }

    for (const [key, item] of Object.entries(value)) {
      visit(item, key);
    }
  }

  for (const payload of payloads) {
    visit(payload);
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

export function verifySetupProofAgainstGitHubPayloads(proof: SetupProof, payloads: unknown[]): SetupVerificationResult {
  const requiredChecks = proof.github?.requiredChecks ?? [];
  const observedRequiredChecks = extractRequiredStatusChecks(payloads);
  const checks: SetupVerificationCheck[] = [
    check("proof_hash", verifySetupProofHash(proof) ? "pass" : "fail", "Setup proof hashes are internally consistent."),
    check("github_repo", proof.github ? "pass" : "fail", "Setup proof names a GitHub repo."),
  ];

  for (const requiredCheck of requiredChecks) {
    checks.push(
      check(
        `required_check_${requiredCheck}`,
        observedRequiredChecks.includes(requiredCheck) ? "pass" : "fail",
        observedRequiredChecks.includes(requiredCheck)
          ? `${requiredCheck} is present in GitHub required status checks.`
          : `${requiredCheck} was not found in GitHub required status checks.`,
      ),
    );
  }

  return {
    status: checks.some((item) => item.status === "fail") ? "fail" : "pass",
    requiredChecks,
    observedRequiredChecks,
    checks,
  };
}
