type RateLimitOptions = {
  namespace: string;
  max: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const maxClientIdentityLength = 128;

function firstHeaderValue(value: string | null) {
  const first = value?.split(",")[0]?.trim() ?? "";

  return first.length > maxClientIdentityLength ? first.slice(0, maxClientIdentityLength) : first;
}

function clientIdentity(request: Request) {
  return (
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ||
    firstHeaderValue(request.headers.get("x-real-ip")) ||
    firstHeaderValue(request.headers.get("x-forwarded-for")) ||
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function normalizedLimitIdentity(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();

  return normalized.length > maxClientIdentityLength ? normalized.slice(0, maxClientIdentityLength) : normalized;
}

export function assertRateLimitForKey(identity: string, options: RateLimitOptions, now = Date.now()) {
  if (options.max < 1 || options.windowMs < 1) {
    throw new Error("Invalid rate limit configuration.");
  }

  pruneExpiredBuckets(now);

  const key = `${options.namespace}:${normalizedLimitIdentity(identity) || "unknown"}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (bucket.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    throw Object.assign(new Error("Too many requests. Try again shortly."), {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }

  bucket.count += 1;
}

export function assertRateLimit(request: Request, options: RateLimitOptions, now = Date.now()) {
  assertRateLimitForKey(clientIdentity(request), options, now);
}

export function resetRateLimitsForTest() {
  buckets.clear();
}
