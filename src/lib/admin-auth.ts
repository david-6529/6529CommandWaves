function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function bearerToken(value: string | null) {
  const match = value?.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() ?? "";
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

export function adminAuthRequired(env: Record<string, string | undefined> = process.env) {
  return hasValue(env.ADMIN_API_KEY) || env.NODE_ENV === "production";
}

export function requireAdminRequest(request: Request, env: Record<string, string | undefined> = process.env) {
  if (!adminAuthRequired(env)) {
    return;
  }

  const expectedKey = env.ADMIN_API_KEY?.trim();

  if (!expectedKey) {
    throw Object.assign(new Error("ADMIN_API_KEY is required before mutating command-wave state."), { status: 503 });
  }

  const suppliedKey = request.headers.get("x-admin-api-key")?.trim() || bearerToken(request.headers.get("authorization"));

  if (!suppliedKey || !safeEqual(suppliedKey, expectedKey)) {
    throw Object.assign(new Error("Admin API key required."), { status: 401 });
  }
}
