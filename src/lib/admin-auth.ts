import { createHash, timingSafeEqual } from "node:crypto";
import { hasEnvValue, isPlaceholderValue, isProductionEnv } from "./env-placeholders";
import { assertRateLimit } from "./rate-limit";

const adminAuthRateLimit = {
  namespace: "admin_auth",
  max: 120,
  windowMs: 60_000,
} as const;

function bearerToken(value: string | null) {
  const match = value?.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

function digestSecret(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(digestSecret(left), digestSecret(right));
}

export function adminAuthRequired(env: Record<string, string | undefined> = process.env) {
  return hasEnvValue(env.ADMIN_API_KEY) || isProductionEnv(env);
}

function adminApiKeyConfigurationError(key: string | undefined, env: Record<string, string | undefined>) {
  if (!hasEnvValue(key)) {
    return "ADMIN_API_KEY is required before mutating command-wave state.";
  }

  if (!isProductionEnv(env)) {
    return null;
  }

  if (isPlaceholderValue(key)) {
    return "Replace placeholder ADMIN_API_KEY with a strong random key before mutating command-wave state.";
  }

  if ((key?.trim().length ?? 0) < 24) {
    return "Use a strong ADMIN_API_KEY with at least 24 characters before mutating command-wave state.";
  }

  return null;
}

export function requireAdminRequest(request: Request, env: Record<string, string | undefined> = process.env) {
  if (!adminAuthRequired(env)) {
    return;
  }

  assertRateLimit(request, adminAuthRateLimit);

  const expectedKey = env.ADMIN_API_KEY?.trim();
  const configurationError = adminApiKeyConfigurationError(expectedKey, env);

  if (configurationError) {
    throw Object.assign(new Error(configurationError), { status: 503 });
  }

  const configuredKey = expectedKey ?? "";
  const suppliedKey = request.headers.get("x-admin-api-key")?.trim() || bearerToken(request.headers.get("authorization"));

  if (!suppliedKey || !safeEqual(suppliedKey, configuredKey)) {
    throw Object.assign(new Error("Admin API key required."), { status: 401 });
  }
}
