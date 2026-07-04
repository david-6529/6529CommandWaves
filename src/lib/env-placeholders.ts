export function isProductionEnv(env: Record<string, string | undefined>) {
  return env.NODE_ENV === "production";
}

export function hasEnvValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export function isPlaceholderValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return Boolean(
    normalized &&
      (normalized.includes("replace-with") ||
        normalized.includes("your-app.example") ||
        normalized.includes("your-") ||
        normalized.includes("user:password@host") ||
        normalized === "postgresql://example" ||
        normalized === "token" ||
        normalized === "admin" ||
        normalized === "password" ||
        normalized === "secret"),
  );
}

export function hasProductionValue(value: string | undefined, env: Record<string, string | undefined>) {
  return hasEnvValue(value) && !(isProductionEnv(env) && isPlaceholderValue(value));
}
